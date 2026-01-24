"""定价服务测试"""
import pytest
from datetime import datetime
from app.services.pricing_service import PricingService, PricingCache, reset_pricing_service
from app.models.pricing import PricingLoader
from app.models.results import PricingMetadata


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
        from app.models.enums import StorageClass

        pricing, _ = service.get_pricing("ap-northeast-1")
        standard_price = pricing.get_storage_price(StorageClass.STANDARD)

        assert standard_price > 0
