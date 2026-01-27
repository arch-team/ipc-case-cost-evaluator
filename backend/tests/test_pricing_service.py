"""定价服务测试"""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from app.services.pricing_service import PricingService, PricingCache, reset_pricing_service
from app.models.pricing import PricingLoader, S3Pricing, StorageClassPricing, DataTransferPricing
from app.models.results import PricingMetadata
from app.models.enums import StorageClass


class TestPricingCache:
    """定价缓存测试"""

    def test_set_and_get(self):
        """测试设置和获取"""
        cache = PricingCache(ttl_hours=24)

        # 使用真实定价数据
        pricing = PricingLoader.load("ap-northeast-1")
        metadata = PricingMetadata(
            source="AWS_API",
            updated_at=datetime.now(),
            region="ap-northeast-1",
            is_fallback=False,
        )

        cache.set("ap-northeast-1", pricing, metadata)

        result = cache.get("ap-northeast-1")
        assert result is not None
        cached_pricing, cached_metadata = result
        assert cached_pricing.region == "ap-northeast-1"

    def test_get_nonexistent(self):
        """测试获取不存在的缓存"""
        cache = PricingCache(ttl_hours=24)
        result = cache.get("nonexistent-region")
        assert result is None

    def test_clear_specific(self):
        """测试清除特定缓存"""
        cache = PricingCache(ttl_hours=24)
        pricing = PricingLoader.load("ap-northeast-1")
        metadata = PricingMetadata(
            source="AWS_API",
            updated_at=datetime.now(),
            region="ap-northeast-1",
            is_fallback=False,
        )

        cache.set("ap-northeast-1", pricing, metadata)
        cache.clear("ap-northeast-1")

        result = cache.get("ap-northeast-1")
        assert result is None

    def test_clear_all(self):
        """测试清除所有缓存"""
        cache = PricingCache(ttl_hours=24)
        pricing = PricingLoader.load("ap-northeast-1")
        metadata = PricingMetadata(
            source="AWS_API",
            updated_at=datetime.now(),
            region="ap-northeast-1",
            is_fallback=False,
        )

        cache.set("ap-northeast-1", pricing, metadata)
        cache.clear()

        assert cache.get("ap-northeast-1") is None

    def test_get_status(self):
        """测试获取状态"""
        cache = PricingCache(ttl_hours=24)
        pricing = PricingLoader.load("ap-northeast-1")
        metadata = PricingMetadata(
            source="AWS_API",
            updated_at=datetime.now(),
            region="ap-northeast-1",
            is_fallback=False,
        )

        cache.set("ap-northeast-1", pricing, metadata)
        status = cache.get_status()

        assert "ap-northeast-1" in status
        assert status["ap-northeast-1"]["cached"] is True


class TestPricingService:
    """定价服务测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """每个测试后重置服务"""
        yield
        reset_pricing_service()

    @pytest.fixture
    def service(self):
        """创建测试服务"""
        return PricingService(
            api_enabled=False,  # 禁用 API 使用本地回退
            fallback_enabled=True,
        )

    def test_get_pricing_local_fallback(self, service):
        """测试本地回退定价"""
        pricing, metadata = service.get_pricing("ap-northeast-1")

        assert pricing is not None
        assert metadata.is_fallback is True
        assert metadata.source == "LOCAL_FALLBACK"

    def test_get_pricing_caching(self, service):
        """测试定价缓存"""
        # 清除缓存
        service.clear_cache()

        # 第一次获取
        pricing1, metadata1 = service.get_pricing("ap-northeast-1")

        # 第二次获取（应该从缓存）
        pricing2, metadata2 = service.get_pricing("ap-northeast-1")

        # 验证返回相同对象
        assert pricing1 is pricing2

    def test_refresh_pricing(self, service):
        """测试刷新定价"""
        # 先获取一次（缓存）
        service.get_pricing("ap-northeast-1")

        # 刷新
        pricing, metadata = service.refresh_pricing("ap-northeast-1")

        assert pricing is not None

    def test_get_pricing_status(self, service):
        """测试获取状态"""
        # 预热缓存
        service.get_pricing("ap-northeast-1")

        status = service.get_pricing_status()

        assert "api_enabled" in status
        assert "cache" in status
        assert "available_regions" in status


class TestPricingServiceIntegration:
    """定价服务集成测试"""

    @pytest.fixture(autouse=True)
    def setup(self):
        yield
        reset_pricing_service()

    @pytest.fixture
    def service(self):
        return PricingService(api_enabled=False, fallback_enabled=True)

    def test_pricing_has_storage_classes(self, service):
        """测试定价有存储类型"""
        pricing, _ = service.get_pricing("ap-northeast-1")

        # 检查是否有存储定价
        assert pricing.storage_classes is not None
        assert len(pricing.storage_classes) > 0

    def test_pricing_has_data_transfer(self, service):
        """测试定价有数据传输"""
        pricing, _ = service.get_pricing("ap-northeast-1")

        assert pricing.data_transfer is not None

    def test_metadata_has_required_fields(self, service):
        """测试元数据有必需字段"""
        _, metadata = service.get_pricing("ap-northeast-1")

        assert metadata.source is not None
        assert metadata.region == "ap-northeast-1"
        assert metadata.updated_at is not None

    def test_get_storage_price(self, service):
        """测试获取存储价格"""
        pricing, _ = service.get_pricing("ap-northeast-1")
        standard_price = pricing.get_storage_price(StorageClass.STANDARD)

        assert standard_price > 0


class TestPricingServiceAWSAPIIntegration:
    """AWS API 集成测试 - 测试 API 成功后保存本地 JSON 的逻辑"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """测试前后清理"""
        yield
        reset_pricing_service()
        # 清理测试文件
        test_file = PricingLoader._pricing_dir / "test-api-region.json"
        if test_file.exists():
            test_file.unlink()
        PricingLoader.clear_cache()

    @pytest.fixture
    def mock_api_pricing(self):
        """创建模拟的 API 返回定价数据"""
        return S3Pricing(
            region="test-api-region",
            region_name="Test API Region",
            currency="USD",
            last_updated="2025-01-28",
            storage_classes={
                StorageClass.STANDARD: StorageClassPricing(
                    storage_per_gb_month=0.023,
                    put_per_1000=0.005,
                    get_per_1000=0.0004,
                    retrieval_per_gb=0,
                    lifecycle_transition_per_1000=0,
                ),
                StorageClass.GLACIER_IR: StorageClassPricing(
                    storage_per_gb_month=0.004,
                    put_per_1000=0.02,
                    get_per_1000=0.01,
                    retrieval_per_gb=0.03,
                    lifecycle_transition_per_1000=0.02,
                ),
            },
            data_transfer=DataTransferPricing(
                out_first_10tb_per_gb=0.114,
                out_next_40tb_per_gb=0.089,
                out_next_100tb_per_gb=0.086,
                out_over_150tb_per_gb=0.084,
            ),
        )

    def test_aws_api_success_saves_local_json(self, mock_api_pricing):
        """测试 AWS API 成功后保存本地 JSON 文件"""
        # 创建服务并 mock API 客户端
        service = PricingService(api_enabled=True, fallback_enabled=True)

        # Mock API 客户端
        mock_client = Mock()
        mock_client.get_s3_pricing.return_value = mock_api_pricing
        service._api_client = mock_client
        service._api_available = True

        # 调用 get_pricing
        pricing, metadata = service.get_pricing("test-api-region")

        # 验证从 API 获取
        assert metadata.source == "AWS_API"
        assert metadata.is_fallback is False

        # 验证本地文件已创建
        test_file = PricingLoader._pricing_dir / "test-api-region.json"
        assert test_file.exists(), "本地 JSON 文件未创建"

    def test_aws_api_success_local_json_content_correct(self, mock_api_pricing):
        """测试 AWS API 成功后本地 JSON 内容正确"""
        import json

        service = PricingService(api_enabled=True, fallback_enabled=True)

        mock_client = Mock()
        mock_client.get_s3_pricing.return_value = mock_api_pricing
        service._api_client = mock_client
        service._api_available = True

        service.get_pricing("test-api-region")

        # 验证文件内容
        test_file = PricingLoader._pricing_dir / "test-api-region.json"
        with open(test_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert data["region"] == "test-api-region"
        assert data["region_name"] == "Test API Region"
        assert data["storage_classes"]["STANDARD"]["storage_per_gb_month"] == 0.023

    def test_aws_api_success_local_json_can_be_loaded_as_fallback(self, mock_api_pricing):
        """测试 AWS API 成功后保存的 JSON 可以作为回退数据加载"""
        # 第一次：模拟 API 成功
        service1 = PricingService(api_enabled=True, fallback_enabled=True)
        mock_client = Mock()
        mock_client.get_s3_pricing.return_value = mock_api_pricing
        service1._api_client = mock_client
        service1._api_available = True
        service1.get_pricing("test-api-region")

        # 清除缓存和服务
        reset_pricing_service()
        PricingLoader.clear_cache()

        # 第二次：禁用 API，使用本地回退
        service2 = PricingService(api_enabled=False, fallback_enabled=True)
        pricing, metadata = service2.get_pricing("test-api-region")

        # 验证从本地回退加载
        assert metadata.source == "LOCAL_FALLBACK"
        assert metadata.is_fallback is True
        assert pricing.region == "test-api-region"
        assert pricing.get_storage_price(StorageClass.STANDARD) == 0.023

    def test_refresh_pricing_updates_local_json(self, mock_api_pricing):
        """测试刷新定价时更新本地 JSON 文件"""
        service = PricingService(api_enabled=True, fallback_enabled=True)

        mock_client = Mock()
        mock_client.get_s3_pricing.return_value = mock_api_pricing
        service._api_client = mock_client
        service._api_available = True

        # 调用 refresh_pricing
        pricing, metadata = service.refresh_pricing("test-api-region")

        # 验证结果
        assert metadata.source == "AWS_API"

        # 验证本地文件已更新
        test_file = PricingLoader._pricing_dir / "test-api-region.json"
        assert test_file.exists()

    def test_aws_api_save_failure_does_not_affect_response(self, mock_api_pricing):
        """测试本地 JSON 保存失败不影响 API 响应"""
        service = PricingService(api_enabled=True, fallback_enabled=True)

        mock_client = Mock()
        mock_client.get_s3_pricing.return_value = mock_api_pricing
        service._api_client = mock_client
        service._api_available = True

        # Mock PricingLoader.save 抛出异常
        with patch.object(PricingLoader, 'save', side_effect=Exception("模拟保存失败")):
            # 应该不抛出异常，正常返回
            pricing, metadata = service.get_pricing("test-api-region")

            assert pricing is not None
            assert metadata.source == "AWS_API"
