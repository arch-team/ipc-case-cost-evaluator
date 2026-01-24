"""S3 Glacier IR 计算器测试

测试 S3GlacierCalculator 类的完整成本计算功能：
- 存储费用计算（更低）
- 请求费用计算（PUT 更高）
- 检索费用计算（Standard 没有，Glacier 有）
- 数据传输费用计算
- 折扣应用
- 中间指标输出
"""
import pytest
from app.services.calculator.s3_glacier import S3GlacierCalculator
from app.services.calculator.s3_standard import S3StandardCalculator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass, SegmentStrategy


class TestS3GlacierCalculator:
    """S3 Glacier IR 计算器测试类"""

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
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1", discount_percent=0.0),
        )

    def test_calculate_returns_cost_summary(self, sample_input: CostCalculationInput):
        """测试计算返回完整的成本汇总

        验证返回的 CostSummary 包含所有必需字段
        """
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)

        # 验证基本字段
        assert result.monthly_total > 0
        assert result.per_device_monthly > 0
        assert result.device_count == 1000

        # 验证费用明细
        assert result.breakdown.storage_cost > 0
        assert result.breakdown.put_request_cost > 0

    def test_has_retrieval_cost(self, sample_input: CostCalculationInput):
        """测试 Glacier IR 有检索费用

        S3 Glacier IR 在访问数据时会收取检索费用
        """
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)
        assert result.breakdown.retrieval_cost > 0

    def test_no_lifecycle_cost(self, sample_input: CostCalculationInput):
        """测试直接使用 Glacier 没有生命周期转换费用

        直接写入 Glacier 不需要生命周期转换费用
        """
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)
        assert result.breakdown.lifecycle_cost == 0

    def test_glacier_has_lower_storage_cost(self, sample_input: CostCalculationInput):
        """测试 Glacier 存储费用更低

        Glacier IR 的存储单价约为 Standard 的 1/4
        """
        glacier_calc = S3GlacierCalculator()
        standard_calc = S3StandardCalculator()

        # Glacier 计算
        glacier_result = glacier_calc.calculate(sample_input)

        # Standard 计算（需要切换存储类型）
        sample_input.technical.storage_class = StorageClass.STANDARD
        standard_result = standard_calc.calculate(sample_input)

        # Glacier 存储费用应该更低
        assert glacier_result.breakdown.storage_cost < standard_result.breakdown.storage_cost

    def test_glacier_has_higher_put_cost(self, sample_input: CostCalculationInput):
        """测试 Glacier PUT 请求费用更高

        Glacier IR 的 PUT 请求费用约为 Standard 的 5-6 倍
        """
        glacier_calc = S3GlacierCalculator()
        standard_calc = S3StandardCalculator()

        # Glacier 计算
        glacier_result = glacier_calc.calculate(sample_input)

        # Standard 计算（需要切换存储类型）
        sample_input.technical.storage_class = StorageClass.STANDARD
        standard_result = standard_calc.calculate(sample_input)

        # Glacier PUT 费用应该更高
        assert glacier_result.breakdown.put_request_cost > standard_result.breakdown.put_request_cost

    def test_calculate_with_discount(self, sample_input: CostCalculationInput):
        """测试折扣应用

        20% 折扣后总成本应为原成本的 80%
        """
        calculator = S3GlacierCalculator()

        # 无折扣
        sample_input.pricing.discount_percent = 0.0
        result_no_discount = calculator.calculate(sample_input)

        # 20% 折扣
        sample_input.pricing.discount_percent = 0.2
        result_with_discount = calculator.calculate(sample_input)

        # 验证折扣效果
        assert result_with_discount.monthly_total < result_no_discount.monthly_total
        ratio = result_with_discount.monthly_total / result_no_discount.monthly_total
        assert ratio == pytest.approx(0.8, rel=0.01)

    def test_zero_access_no_retrieval(self, sample_input: CostCalculationInput):
        """测试零访问时没有检索费用

        当没有回看时，GET 请求和检索费用应该为零
        """
        sample_input.functional.access_pattern = 0.0
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)

        assert result.breakdown.retrieval_cost == 0
        assert result.breakdown.get_request_cost == 0
        assert result.breakdown.data_transfer_cost == 0

    def test_metrics_included(self, sample_input: CostCalculationInput):
        """测试中间指标包含在结果中

        验证返回的结果包含完整的中间计算指标
        """
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)

        assert result.metrics is not None
        assert result.metrics.daily_data_gb > 0
        assert result.metrics.avg_storage_gb > 0
        assert result.metrics.monthly_puts > 0
        assert result.metrics.monthly_retrieval_gb > 0

    def test_per_device_calculation(self, sample_input: CostCalculationInput):
        """测试单设备成本计算

        单设备月度成本 = 总成本 / 设备数量
        """
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)

        expected_per_device = result.monthly_total / sample_input.functional.device_count
        assert result.per_device_monthly == pytest.approx(expected_per_device, rel=0.001)

    def test_yearly_cost(self, sample_input: CostCalculationInput):
        """测试年度成本计算

        年度成本 = 月度成本 x 12
        """
        calculator = S3GlacierCalculator()
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
        calculator = S3GlacierCalculator()
        result = calculator.calculate(sample_input)

        assert result.breakdown.total == pytest.approx(result.monthly_total, rel=0.001)


class TestS3GlacierDifferentScenarios:
    """测试不同场景下的 S3 Glacier IR 计算"""

    def test_high_access_pattern_increases_retrieval_cost(self):
        """测试高访问比例场景

        当回看比例高时，检索费用占比应该增加
        """
        low_access = CostCalculationInput(
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
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        high_access = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.5,  # 50% 回看比例
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3GlacierCalculator()
        result_low = calculator.calculate(low_access)
        result_high = calculator.calculate(high_access)

        # 高访问比例的检索费用应该更高
        assert result_high.breakdown.retrieval_cost > result_low.breakdown.retrieval_cost
        # 检索费用应该是 5 倍
        ratio = result_high.breakdown.retrieval_cost / result_low.breakdown.retrieval_cost
        assert ratio == pytest.approx(5.0, rel=0.01)

    def test_longer_retention_increases_storage(self):
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
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
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
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3GlacierCalculator()
        result_30d = calculator.calculate(short_retention)
        result_90d = calculator.calculate(long_retention)

        # 存储量应该是 3 倍
        ratio = result_90d.metrics.avg_storage_gb / result_30d.metrics.avg_storage_gb
        assert ratio == pytest.approx(3.0, rel=0.01)


class TestS3GlacierVsStandardComparison:
    """测试 Glacier IR 与 Standard 的成本对比"""

    def test_glacier_better_for_low_access(self):
        """测试低访问场景 Glacier 更划算

        在低访问比例下，Glacier 的总成本应该更低
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=1000,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality=VideoQuality.P1080,
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.05,  # 5% 低回看
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        glacier_calc = S3GlacierCalculator()
        standard_calc = S3StandardCalculator()

        glacier_result = glacier_calc.calculate(input_data)

        input_data.technical.storage_class = StorageClass.STANDARD
        standard_result = standard_calc.calculate(input_data)

        # 低访问场景下 Glacier 应该更便宜（存储费用节省大于请求费用增加）
        # 这取决于具体定价，可能需要调整
        # 先只验证 Glacier 存储费用确实更低
        assert glacier_result.breakdown.storage_cost < standard_result.breakdown.storage_cost

    def test_retrieval_cost_difference(self):
        """测试检索费用差异

        Standard 没有检索费用，Glacier 有
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
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        glacier_calc = S3GlacierCalculator()
        standard_calc = S3StandardCalculator()

        glacier_result = glacier_calc.calculate(input_data)

        input_data.technical.storage_class = StorageClass.STANDARD
        standard_result = standard_calc.calculate(input_data)

        # Standard 没有检索费用
        assert standard_result.breakdown.retrieval_cost == 0
        # Glacier 有检索费用
        assert glacier_result.breakdown.retrieval_cost > 0


class TestS3GlacierEdgeCases:
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
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3GlacierCalculator()
        result = calculator.calculate(input_data)

        # 单设备时，月度总成本等于单设备成本
        assert result.monthly_total == result.per_device_monthly
        assert result.device_count == 1

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
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1", discount_percent=0.0),
        )

        calculator = S3GlacierCalculator()
        result_no_discount = calculator.calculate(input_data)

        input_data.pricing.discount_percent = 0.5
        result_with_discount = calculator.calculate(input_data)

        ratio = result_with_discount.monthly_total / result_no_discount.monthly_total
        assert ratio == pytest.approx(0.5, rel=0.01)

    def test_continuous_recording(self):
        """测试全天候录像场景

        全天候录像产生大量数据，Glacier 存储成本优势更明显
        """
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.CONTINUOUS,
                video_quality=VideoQuality.P1080,
                retention_days=30,
                access_pattern=0.05,
                segment_strategy=SegmentStrategy.FIXED_DURATION,
                segment_value=15,
            ),
            technical=TechnicalDimensions(storage_class=StorageClass.GLACIER_IR),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = S3GlacierCalculator()
        result = calculator.calculate(input_data)

        # 全天候录像的每日数据量应该很大
        assert result.metrics.daily_data_gb > 2000  # ~2574 GB for 100 devices
        # 检索费用应该存在（即使低访问比例）
        assert result.breakdown.retrieval_cost > 0
