"""S3 Standard 计算器测试

测试 S3StandardCalculator 类的完整成本计算功能：
- 存储费用计算
- 请求费用计算
- 数据传输费用计算
- 折扣应用
- 中间指标输出
"""
import pytest
from app.services.calculator.s3_standard import S3StandardCalculator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass, SegmentStrategy


class TestS3StandardCalculator:
    """S3 Standard 计算器测试类"""

    @pytest.fixture
    def sample_input(self) -> CostCalculationInput:
        """标准测试输入

        1000 设备，事件触发模式，1080p，400事件/天，15秒/事件
        保留 30 天，10% 回看比例
        """
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1", discount_percent=0.0),
        )

    def test_calculate_returns_cost_summary(self, sample_input: CostCalculationInput):
        """测试计算返回完整的成本汇总

        验证返回的 CostSummary 包含所有必需字段
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)

        # 验证基本字段
        assert result.monthly_total > 0
        assert result.per_device_monthly > 0
        assert result.device_count == 1000

        # 验证费用明细
        assert result.breakdown.storage_cost > 0
        assert result.breakdown.put_request_cost > 0
        assert result.breakdown.get_request_cost > 0
        assert result.breakdown.data_transfer_cost >= 0

    def test_calculate_with_discount(self, sample_input: CostCalculationInput):
        """测试折扣应用

        10% 折扣后总成本应为原成本的 90%
        """
        calculator = S3StandardCalculator()

        # 无折扣
        sample_input.pricing.discount_percent = 0.0
        result_no_discount = calculator.calculate(sample_input)

        # 10% 折扣
        sample_input.pricing.discount_percent = 0.1
        result_with_discount = calculator.calculate(sample_input)

        # 验证折扣效果
        assert result_with_discount.monthly_total < result_no_discount.monthly_total
        ratio = result_with_discount.monthly_total / result_no_discount.monthly_total
        assert ratio == pytest.approx(0.9, rel=0.01)

    def test_no_retrieval_cost(self, sample_input: CostCalculationInput):
        """测试 Standard 没有检索费用

        S3 Standard 不收取数据检索费用
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)
        assert result.breakdown.retrieval_cost == 0

    def test_no_lifecycle_cost(self, sample_input: CostCalculationInput):
        """测试 Standard 没有生命周期转换费用

        纯 Standard 存储不需要生命周期转换
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)
        assert result.breakdown.lifecycle_cost == 0

    def test_storage_is_dominant_cost(self, sample_input: CostCalculationInput):
        """测试存储费用是主要成本

        在典型场景下，存储费用应占总成本的 30% 以上
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)
        percentages = result.breakdown.percentages
        assert percentages["storage_cost"] > 0.3

    def test_metrics_included(self, sample_input: CostCalculationInput):
        """测试中间指标包含在结果中

        验证返回的结果包含完整的中间计算指标
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)

        assert result.metrics is not None
        assert result.metrics.daily_data_gb > 0
        assert result.metrics.avg_storage_gb > 0
        assert result.metrics.monthly_puts > 0
        assert result.metrics.monthly_gets > 0
        assert result.metrics.monthly_retrieval_gb >= 0
        assert result.metrics.monthly_transfer_gb >= 0

    def test_per_device_calculation(self, sample_input: CostCalculationInput):
        """测试单设备成本计算

        单设备月度成本 = 总成本 / 设备数量
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)

        expected_per_device = result.monthly_total / sample_input.functional.device_count
        assert result.per_device_monthly == pytest.approx(expected_per_device, rel=0.001)

    def test_yearly_cost(self, sample_input: CostCalculationInput):
        """测试年度成本计算

        年度成本 = 月度成本 x 12
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)

        assert result.yearly_total == pytest.approx(result.monthly_total * 12, rel=0.001)
        assert result.per_device_yearly == pytest.approx(
            result.per_device_monthly * 12, rel=0.001
        )

    def test_breakdown_total_equals_monthly_total(
        self, sample_input: CostCalculationInput
    ):
        """测试费用明细总和等于月度总成本

        breakdown.total 应该等于 monthly_total
        """
        calculator = S3StandardCalculator()
        result = calculator.calculate(sample_input)

        assert result.breakdown.total == pytest.approx(result.monthly_total, rel=0.001)


class TestS3StandardDifferentScenarios:
    """测试不同场景下的 S3 Standard 计算"""

    def test_continuous_recording_scenario(self):
        """测试全天候录像场景

        100 设备全天候录像，数据量和成本都应该很高
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.CONTINUOUS,
                video_quality=VideoQuality.P1080,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 全天候录像的每日数据量应该很大
        assert result.metrics.daily_data_gb > 2000  # ~2574 GB for 100 devices

    def test_low_access_pattern(self):
        """测试低访问比例场景

        当回看比例很低时，GET 请求和数据传输成本应该很低
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.01,  # 1% 回看比例
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # GET 和传输成本占比应该很低
        percentages = result.breakdown.percentages
        assert percentages["get_request_cost"] < 0.1
        assert percentages["data_transfer_cost"] < 0.2

    def test_high_quality_video(self):
        """测试高质量视频场景

        4K 视频的数据量是 1080p 的约 4.8 倍
        """
        base_input = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        high_quality_input = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P4K,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result_1080p = calculator.calculate(base_input)
        result_4k = calculator.calculate(high_quality_input)

        # 4K 数据率是 1080p 的 1500/312.5 = 4.8 倍
        ratio = result_4k.metrics.daily_data_gb / result_1080p.metrics.daily_data_gb
        assert ratio == pytest.approx(4.8, rel=0.01)

    def test_longer_retention_period(self):
        """测试长保留期场景

        90 天保留期的存储量是 30 天的 3 倍
        """
        short_retention = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        long_retention = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=90,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result_30d = calculator.calculate(short_retention)
        result_90d = calculator.calculate(long_retention)

        # 存储量应该是 3 倍
        ratio = result_90d.metrics.avg_storage_gb / result_30d.metrics.avg_storage_gb
        assert ratio == pytest.approx(3.0, rel=0.01)


class TestS3StandardEdgeCases:
    """测试边界情况"""

    def test_single_device(self):
        """测试单设备场景"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 单设备时，月度总成本等于单设备成本
        assert result.monthly_total == result.per_device_monthly
        assert result.device_count == 1

    def test_zero_access_pattern(self):
        """测试零回看比例

        当没有回看时，GET 请求和数据传输成本应该为零
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.0,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        assert result.breakdown.get_request_cost == 0
        assert result.breakdown.data_transfer_cost == 0
        assert result.metrics.monthly_gets == 0
        assert result.metrics.monthly_transfer_gb == 0

    def test_maximum_discount(self):
        """测试最大折扣

        50% 折扣后成本应为原成本的一半
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.STANDARD),
            pricing=PricingDimensions(region="ap-northeast-1", discount_percent=0.0),
        )

        calculator = S3StandardCalculator()
        result_no_discount = calculator.calculate(input_data)

        input_data.pricing.discount_percent = 0.5
        result_with_discount = calculator.calculate(input_data)

        ratio = result_with_discount.monthly_total / result_no_discount.monthly_total
        assert ratio == pytest.approx(0.5, rel=0.01)
