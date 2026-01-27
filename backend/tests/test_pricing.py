"""AWS 定价模型测试

测试 S3 定价模型和定价数据加载器的功能。
包括区域定价加载、价格查询和缓存机制测试。
"""
import pytest
from app.models.pricing import PricingLoader, StorageClassPricing
from app.models.enums import StorageClass


class TestStorageClassPricing:
    """存储类型定价模型测试"""

    def test_create_storage_class_pricing(self):
        """测试创建存储类型定价"""
        pricing = StorageClassPricing(
            storage_per_gb_month=0.025,
            put_per_1000=0.0047,
            get_per_1000=0.0004,
            retrieval_per_gb=0,
            lifecycle_transition_per_1000=0,
        )
        assert pricing.storage_per_gb_month == 0.025
        assert pricing.put_per_1000 == 0.0047
        assert pricing.get_per_1000 == 0.0004
        assert pricing.retrieval_per_gb == 0
        assert pricing.lifecycle_transition_per_1000 == 0

    def test_glacier_ir_pricing(self):
        """测试 Glacier IR 定价包含检索费用"""
        pricing = StorageClassPricing(
            storage_per_gb_month=0.005,
            put_per_1000=0.02,
            get_per_1000=0.01,
            retrieval_per_gb=0.03,
            lifecycle_transition_per_1000=0.02,
        )
        assert pricing.retrieval_per_gb == 0.03
        assert pricing.lifecycle_transition_per_1000 == 0.02


class TestS3Pricing:
    """S3 区域定价模型测试"""

    def test_load_ap_northeast_1(self):
        """测试加载东京区域定价"""
        pricing = PricingLoader.load("ap-northeast-1")
        assert pricing.region == "ap-northeast-1"
        assert pricing.region_name == "Asia Pacific (Tokyo)"
        assert pricing.currency == "USD"
        assert StorageClass.STANDARD in pricing.storage_classes
        standard = pricing.storage_classes[StorageClass.STANDARD]
        assert standard.storage_per_gb_month > 0

    def test_get_storage_price(self):
        """测试获取存储价格"""
        # 使用 us-east-1 作为基准区域进行测试
        pricing = PricingLoader.load("us-east-1")
        price = pricing.get_storage_price(StorageClass.STANDARD)
        assert price == pytest.approx(0.023, rel=0.01)

    def test_get_put_request_price(self):
        """测试获取 PUT 请求价格"""
        pricing = PricingLoader.load("us-east-1")
        price = pricing.get_put_price(StorageClass.STANDARD)
        assert price == pytest.approx(0.005, rel=0.01)

    def test_get_get_request_price(self):
        """测试获取 GET 请求价格"""
        pricing = PricingLoader.load("us-east-1")
        price = pricing.get_get_price(StorageClass.STANDARD)
        assert price == pytest.approx(0.0004, rel=0.01)

    def test_get_retrieval_price_standard(self):
        """测试 Standard 存储没有检索费用"""
        pricing = PricingLoader.load("us-east-1")
        price = pricing.get_retrieval_price(StorageClass.STANDARD)
        assert price == 0

    def test_get_retrieval_price_glacier_ir(self):
        """测试 Glacier IR 存储有检索费用"""
        pricing = PricingLoader.load("us-east-1")
        price = pricing.get_retrieval_price(StorageClass.GLACIER_IR)
        assert price == pytest.approx(0.03, rel=0.01)

    def test_get_lifecycle_price(self):
        """测试获取生命周期转换费用"""
        pricing = PricingLoader.load("us-east-1")
        price = pricing.get_lifecycle_price(StorageClass.GLACIER_IR)
        assert price == pytest.approx(0.02, rel=0.01)

    def test_all_storage_classes_loaded(self):
        """测试所有存储类型都已加载"""
        pricing = PricingLoader.load("us-east-1")
        # 验证所有 7 种存储类型都已加载
        for sc in StorageClass:
            assert sc in pricing.storage_classes, f"缺少存储类型: {sc.value}"


class TestDataTransferPricing:
    """数据传输定价测试"""

    def test_get_data_transfer_price_small(self):
        """测试小数据量传输价格 (10TB 以内)"""
        pricing = PricingLoader.load("ap-northeast-1")
        price = pricing.get_data_transfer_price(100)  # 100 GB
        assert price == pytest.approx(0.114, rel=0.01)

    def test_get_data_transfer_price_medium(self):
        """测试中等数据量传输价格 (10-50TB)"""
        pricing = PricingLoader.load("ap-northeast-1")
        price = pricing.get_data_transfer_price(15 * 1024)  # 15 TB
        assert price == pytest.approx(0.089, rel=0.01)

    def test_get_data_transfer_price_large(self):
        """测试大数据量传输价格 (50-150TB)"""
        pricing = PricingLoader.load("ap-northeast-1")
        price = pricing.get_data_transfer_price(100 * 1024)  # 100 TB
        assert price == pytest.approx(0.086, rel=0.01)

    def test_get_data_transfer_price_very_large(self):
        """测试超大数据量传输价格 (150TB 以上)"""
        pricing = PricingLoader.load("ap-northeast-1")
        price = pricing.get_data_transfer_price(200 * 1024)  # 200 TB
        assert price == pytest.approx(0.084, rel=0.01)

    def test_get_data_transfer_price_zero(self):
        """测试零数据量传输价格"""
        pricing = PricingLoader.load("ap-northeast-1")
        price = pricing.get_data_transfer_price(0)
        assert price == 0

    def test_get_data_transfer_price_negative(self):
        """测试负数据量返回零"""
        pricing = PricingLoader.load("ap-northeast-1")
        price = pricing.get_data_transfer_price(-100)
        assert price == 0


class TestPricingLoader:
    """定价加载器测试"""

    def test_load_invalid_region(self):
        """测试加载不存在的区域抛出异常"""
        with pytest.raises(ValueError, match="不支持的区域"):
            PricingLoader.load("invalid-region")

    def test_available_regions(self):
        """测试获取可用区域列表"""
        regions = PricingLoader.available_regions()
        assert "ap-northeast-1" in regions

    def test_caching(self):
        """测试定价数据缓存机制"""
        PricingLoader.clear_cache()  # 清除缓存确保测试独立
        pricing1 = PricingLoader.load("ap-northeast-1")
        pricing2 = PricingLoader.load("ap-northeast-1")
        assert pricing1 is pricing2  # 应该是同一个对象实例

    def test_clear_cache(self):
        """测试清除缓存"""
        pricing1 = PricingLoader.load("ap-northeast-1")
        PricingLoader.clear_cache()
        pricing2 = PricingLoader.load("ap-northeast-1")
        assert pricing1 is not pricing2  # 清除缓存后应该是不同对象


class TestPricingLoaderSave:
    """定价保存功能测试"""

    @pytest.fixture
    def sample_pricing(self):
        """创建测试用的定价数据"""
        from app.models.pricing import S3Pricing, DataTransferPricing

        return S3Pricing(
            region="test-save-region",
            region_name="Test Save Region",
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

    @pytest.fixture
    def cleanup_test_file(self):
        """清理测试文件"""
        yield
        # 测试后清理
        test_file = PricingLoader._pricing_dir / "test-save-region.json"
        if test_file.exists():
            test_file.unlink()
        # 清除缓存
        PricingLoader.clear_cache()

    def test_save_creates_file(self, sample_pricing, cleanup_test_file):
        """测试 save 方法创建 JSON 文件"""
        PricingLoader.save(sample_pricing)

        pricing_file = PricingLoader._pricing_dir / "test-save-region.json"
        assert pricing_file.exists(), "定价文件未创建"

    def test_save_file_content_correct(self, sample_pricing, cleanup_test_file):
        """测试保存的文件内容正确"""
        import json

        PricingLoader.save(sample_pricing)

        pricing_file = PricingLoader._pricing_dir / "test-save-region.json"
        with open(pricing_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert data["region"] == "test-save-region"
        assert data["region_name"] == "Test Save Region"
        assert data["currency"] == "USD"
        assert data["last_updated"] == "2025-01-28"
        assert "STANDARD" in data["storage_classes"]
        assert "GLACIER_IR" in data["storage_classes"]
        assert data["storage_classes"]["STANDARD"]["storage_per_gb_month"] == 0.023
        assert data["data_transfer"]["out_first_10tb_per_gb"] == 0.114

    def test_save_updates_memory_cache(self, sample_pricing, cleanup_test_file):
        """测试 save 方法更新内存缓存"""
        PricingLoader.clear_cache()
        PricingLoader.save(sample_pricing)

        # 从缓存获取应该返回相同对象
        cached = PricingLoader._cache.get("test-save-region")
        assert cached is not None
        assert cached.region == "test-save-region"

    def test_save_file_can_be_loaded(self, sample_pricing, cleanup_test_file):
        """测试保存的文件可以被正确加载"""
        PricingLoader.save(sample_pricing)
        PricingLoader.clear_cache()  # 清除缓存强制从文件加载

        loaded = PricingLoader.load("test-save-region")

        assert loaded.region == "test-save-region"
        assert loaded.region_name == "Test Save Region"
        assert StorageClass.STANDARD in loaded.storage_classes
        assert StorageClass.GLACIER_IR in loaded.storage_classes
        assert loaded.get_storage_price(StorageClass.STANDARD) == 0.023

    def test_save_overwrites_existing_file(self, sample_pricing, cleanup_test_file):
        """测试 save 方法覆盖已存在的文件"""
        from app.models.pricing import S3Pricing, DataTransferPricing

        # 先保存一次
        PricingLoader.save(sample_pricing)

        # 修改数据再保存
        updated_pricing = S3Pricing(
            region="test-save-region",
            region_name="Updated Test Region",
            currency="USD",
            last_updated="2025-01-29",
            storage_classes={
                StorageClass.STANDARD: StorageClassPricing(
                    storage_per_gb_month=0.025,  # 更新价格
                    put_per_1000=0.006,
                    get_per_1000=0.0005,
                    retrieval_per_gb=0,
                    lifecycle_transition_per_1000=0,
                ),
            },
            data_transfer=DataTransferPricing(
                out_first_10tb_per_gb=0.12,
                out_next_40tb_per_gb=0.09,
                out_next_100tb_per_gb=0.087,
                out_over_150tb_per_gb=0.085,
            ),
        )
        PricingLoader.save(updated_pricing)
        PricingLoader.clear_cache()

        # 加载并验证是新数据
        loaded = PricingLoader.load("test-save-region")
        assert loaded.region_name == "Updated Test Region"
        assert loaded.last_updated == "2025-01-29"
        assert loaded.get_storage_price(StorageClass.STANDARD) == 0.025


class TestPricingComparison:
    """定价对比测试"""

    def test_glacier_ir_cheaper_storage(self):
        """测试 Glacier IR 存储费用低于 Standard"""
        pricing = PricingLoader.load("ap-northeast-1")
        standard_storage = pricing.get_storage_price(StorageClass.STANDARD)
        glacier_storage = pricing.get_storage_price(StorageClass.GLACIER_IR)
        assert glacier_storage < standard_storage

    def test_glacier_ir_more_expensive_put(self):
        """测试 Glacier IR PUT 请求费用高于 Standard"""
        pricing = PricingLoader.load("ap-northeast-1")
        standard_put = pricing.get_put_price(StorageClass.STANDARD)
        glacier_put = pricing.get_put_price(StorageClass.GLACIER_IR)
        assert glacier_put > standard_put

    def test_deep_archive_cheapest_storage(self):
        """测试 Deep Archive 存储费用最低"""
        pricing = PricingLoader.load("ap-northeast-1")
        standard_storage = pricing.get_storage_price(StorageClass.STANDARD)
        glacier_storage = pricing.get_storage_price(StorageClass.GLACIER_IR)
        deep_archive_storage = pricing.get_storage_price(StorageClass.DEEP_ARCHIVE)
        assert deep_archive_storage < glacier_storage < standard_storage
