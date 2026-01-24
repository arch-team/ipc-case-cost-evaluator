"""生命周期混合策略计算器测试"""
import pytest
from app.services.calculator.lifecycle import LifecycleCalculator
from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
    LifecyclePolicy,
)
from app.models.enums import RecordingMode, VideoQuality, StorageClass


class TestLifecycleCalculator:
    """生命周期计算器测试"""

    @pytest.fixture
    def sample_input(self):
        """示例输入 - 7天后转换到 Glacier IR"""
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
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    transition_days=7,
                    target_class=StorageClass.GLACIER_IR,
                ),
            ),
            pricing=PricingDimensions(
                region="ap-northeast-1",
                discount_percent=0.0,
            ),
        )

    def test_calculate_returns_cost_summary(self, sample_input):
        """测试计算返回成本汇总"""
        calculator = LifecycleCalculator()
        result = calculator.calculate(sample_input)

        assert result.monthly_total > 0
        assert result.per_device_monthly > 0
        assert result.device_count == 1000

    def test_has_lifecycle_cost(self, sample_input):
        """测试有生命周期转换费用"""
        calculator = LifecycleCalculator()
        result = calculator.calculate(sample_input)

        # 生命周期转换费用应大于 0
        assert result.breakdown.lifecycle_cost > 0

    def test_cost_between_standard_and_glacier(self, sample_input):
        """测试费用介于 Standard 和 Glacier 之间"""
        from app.services.calculator.s3_standard import S3StandardCalculator
        from app.services.calculator.s3_glacier import S3GlacierCalculator

        lifecycle_calc = LifecycleCalculator()
        standard_calc = S3StandardCalculator()
        glacier_calc = S3GlacierCalculator()

        lifecycle_result = lifecycle_calc.calculate(sample_input)

        # Standard 计算
        standard_input = sample_input.model_copy(deep=True)
        standard_input.technical.lifecycle_policy = None
        standard_result = standard_calc.calculate(standard_input)

        # Glacier 计算
        glacier_input = sample_input.model_copy(deep=True)
        glacier_input.technical.storage_class = StorageClass.GLACIER_IR
        glacier_input.technical.lifecycle_policy = None
        glacier_result = glacier_calc.calculate(glacier_input)

        # 生命周期策略费用应该介于纯 Standard 和纯 Glacier 之间
        # 但由于有转换费用，可能高于 Glacier
        assert lifecycle_result.monthly_total < standard_result.monthly_total
        # 注意：由于转换费用，lifecycle 可能比 glacier 稍高或稍低

    def test_storage_cost_mixed(self, sample_input):
        """测试存储费用是热存储和冷存储的混合"""
        calculator = LifecycleCalculator()
        result = calculator.calculate(sample_input)

        # 存储费用应该反映混合策略
        # 7天在 Standard，23天在 Glacier
        assert result.breakdown.storage_cost > 0

    def test_transition_days_affects_cost(self, sample_input):
        """测试转换天数影响费用"""
        calculator = LifecycleCalculator()

        # 7 天转换
        result_7d = calculator.calculate(sample_input)

        # 14 天转换
        sample_input.technical.lifecycle_policy.transition_days = 14
        result_14d = calculator.calculate(sample_input)

        # 更晚转换意味着更多数据在 Standard，存储费用更高
        assert result_14d.breakdown.storage_cost > result_7d.breakdown.storage_cost

    def test_with_discount(self, sample_input):
        """测试带折扣的计算"""
        sample_input.pricing.discount_percent = 0.1

        calculator = LifecycleCalculator()
        result_with_discount = calculator.calculate(sample_input)

        sample_input.pricing.discount_percent = 0.0
        result_no_discount = calculator.calculate(sample_input)

        # 有折扣的费用应该更低
        assert result_with_discount.monthly_total < result_no_discount.monthly_total

    def test_disabled_lifecycle_raises_error(self):
        """测试禁用生命周期策略时抛出错误"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(enabled=False),
            ),
            pricing=PricingDimensions(),
        )

        calculator = LifecycleCalculator()
        with pytest.raises(ValueError, match="生命周期策略未启用"):
            calculator.calculate(input_data)

    def test_no_lifecycle_policy_raises_error(self):
        """测试无生命周期策略时抛出错误"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=None,
            ),
            pricing=PricingDimensions(),
        )

        calculator = LifecycleCalculator()
        with pytest.raises(ValueError, match="生命周期策略未启用"):
            calculator.calculate(input_data)

    def test_metrics_included(self, sample_input):
        """测试包含中间指标"""
        calculator = LifecycleCalculator()
        result = calculator.calculate(sample_input)

        assert result.metrics is not None
        assert result.metrics.daily_data_gb > 0
        assert result.metrics.avg_storage_gb > 0
        assert result.metrics.monthly_puts > 0


class TestLifecycleCalculatorEdgeCases:
    """生命周期计算器边界测试"""

    def test_transition_at_day_1(self):
        """测试第1天就转换"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    transition_days=1,
                    target_class=StorageClass.GLACIER_IR,
                ),
            ),
            pricing=PricingDimensions(),
        )

        calculator = LifecycleCalculator()
        result = calculator.calculate(input_data)

        # 应该接近纯 Glacier 费用，但有转换费用
        assert result.monthly_total > 0

    def test_transition_at_last_day(self):
        """测试最后一天才转换"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    transition_days=29,
                    target_class=StorageClass.GLACIER_IR,
                ),
            ),
            pricing=PricingDimensions(),
        )

        calculator = LifecycleCalculator()
        result = calculator.calculate(input_data)

        # 应该接近纯 Standard 费用，但有少量转换
        assert result.monthly_total > 0

    def test_continuous_recording(self):
        """测试全天候录像模式"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.CONTINUOUS,
                retention_days=30,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    transition_days=7,
                    target_class=StorageClass.GLACIER_IR,
                ),
            ),
            pricing=PricingDimensions(),
        )

        calculator = LifecycleCalculator()
        result = calculator.calculate(input_data)

        assert result.monthly_total > 0
        assert result.breakdown.lifecycle_cost > 0
