"""方案对比器测试"""
import pytest
from app.services.calculator.comparator import StorageComparator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
    LifecyclePolicy,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass
from app.models.results import ComparisonResult, ComparisonItem


class TestStorageComparator:
    """方案对比器测试"""

    @pytest.fixture
    def sample_input(self):
        """示例输入"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
            ),
            pricing=PricingDimensions(
                region="ap-northeast-1",
                discount_percent=0.0,
            ),
        )

    def test_compare_returns_comparison_result(self, sample_input):
        """测试对比返回对比结果"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        assert isinstance(result, ComparisonResult)
        assert len(result.items) >= 2

    def test_includes_standard_option(self, sample_input):
        """测试包含 Standard 选项"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        standard = result.get_by_name("S3 Standard")
        assert standard is not None
        assert standard.storage_class == "STANDARD"

    def test_includes_glacier_option(self, sample_input):
        """测试包含 Glacier IR 选项"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        glacier = result.get_by_name("S3 Glacier IR")
        assert glacier is not None
        assert glacier.storage_class == "GLACIER_IR"

    def test_includes_lifecycle_option(self, sample_input):
        """测试包含生命周期选项"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        lifecycle = result.get_by_name("Standard + Lifecycle (7天)")
        assert lifecycle is not None

    def test_baseline_is_standard(self, sample_input):
        """测试基准方案是 Standard"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        assert result.baseline == "S3 Standard"
        standard = result.get_by_name("S3 Standard")
        assert standard.vs_baseline == 0.0

    def test_vs_baseline_calculation(self, sample_input):
        """测试相对基准的差异计算"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        standard = result.get_by_name("S3 Standard")
        glacier = result.get_by_name("S3 Glacier IR")

        # Glacier 通常比 Standard 便宜
        expected_diff = (glacier.monthly_cost - standard.monthly_cost) / standard.monthly_cost
        assert glacier.vs_baseline == pytest.approx(expected_diff, rel=0.01)

    def test_best_option_is_cheapest(self, sample_input):
        """测试最优方案是最便宜的"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        best = result.best_option
        for item in result.items:
            assert item.monthly_cost >= best.monthly_cost

    def test_all_items_have_breakdown(self, sample_input):
        """测试所有方案都有费用明细"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        for item in result.items:
            assert item.breakdown is not None
            assert item.breakdown.total > 0

    def test_yearly_cost_calculation(self, sample_input):
        """测试年度费用计算"""
        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        for item in result.items:
            assert item.yearly_cost == pytest.approx(item.monthly_cost * 12, rel=0.01)

    def test_with_discount(self, sample_input):
        """测试带折扣的对比"""
        sample_input.pricing.discount_percent = 0.1

        comparator = StorageComparator()
        result = comparator.compare(sample_input)

        # 所有方案费用应该反映折扣
        assert len(result.items) >= 2
        for item in result.items:
            assert item.monthly_cost > 0


class TestStorageComparatorEdgeCases:
    """方案对比器边界测试"""

    def test_single_device(self):
        """测试单设备场景"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        comparator = StorageComparator()
        result = comparator.compare(input_data)

        assert len(result.items) >= 2

    def test_continuous_recording(self):
        """测试全天候录像"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.CONTINUOUS,
                retention_days=30,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        comparator = StorageComparator()
        result = comparator.compare(input_data)

        assert len(result.items) >= 2

    def test_high_access_pattern(self):
        """测试高访问比例"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                access_pattern=0.8,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        comparator = StorageComparator()
        result = comparator.compare(input_data)

        # 高访问时 Glacier 检索费用高，可能不是最优
        glacier = result.get_by_name("S3 Glacier IR")
        standard = result.get_by_name("S3 Standard")
        # 不一定 Glacier 更便宜了
        assert glacier is not None and standard is not None


class TestStorageComparatorCustomOptions:
    """自定义方案对比测试"""

    def test_compare_specific_options(self):
        """测试对比指定的方案"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        comparator = StorageComparator()
        result = comparator.compare(
            input_data,
            include_lifecycle=False,
        )

        # 不包含生命周期选项
        lifecycle = result.get_by_name("Standard + Lifecycle (7天)")
        assert lifecycle is None
        assert len(result.items) == 2

    def test_custom_lifecycle_days(self):
        """测试自定义生命周期转换天数"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=30,
            ),
            technical=TechnicalDimensions(),
            pricing=PricingDimensions(),
        )

        comparator = StorageComparator()
        result = comparator.compare(
            input_data,
            lifecycle_days=14,
        )

        lifecycle = result.get_by_name("Standard + Lifecycle (14天)")
        assert lifecycle is not None
