"""多阶段生命周期测试"""
import pytest
from app.models.dimensions import (
    LifecycleStage,
    LifecyclePolicy,
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
    CostCalculationInput,
)
from app.models.enums import StorageClass, RecordingMode
from app.services.calculator.lifecycle import LifecycleCalculator


class TestLifecycleStage:
    """生命周期阶段模型测试"""

    def test_create_valid_stage(self):
        """测试创建有效阶段"""
        stage = LifecycleStage(
            start_day=1,
            end_day=7,
            storage_class=StorageClass.STANDARD,
        )
        assert stage.start_day == 1
        assert stage.end_day == 7
        assert stage.storage_class == StorageClass.STANDARD

    def test_duration_days_property(self):
        """测试 duration_days 属性"""
        stage = LifecycleStage(
            start_day=1,
            end_day=7,
            storage_class=StorageClass.STANDARD,
        )
        assert stage.duration_days == 7

    def test_duration_days_single_day(self):
        """测试单日阶段"""
        stage = LifecycleStage(
            start_day=5,
            end_day=5,
            storage_class=StorageClass.GLACIER_IR,
        )
        assert stage.duration_days == 1

    def test_invalid_start_day_zero(self):
        """测试无效起始日（0）"""
        with pytest.raises(ValueError):
            LifecycleStage(
                start_day=0,
                end_day=7,
                storage_class=StorageClass.STANDARD,
            )

    def test_invalid_end_day_zero(self):
        """测试无效结束日（0）"""
        with pytest.raises(ValueError):
            LifecycleStage(
                start_day=1,
                end_day=0,
                storage_class=StorageClass.STANDARD,
            )


class TestLifecyclePolicyMultiStage:
    """多阶段生命周期策略测试"""

    def test_is_multi_stage_with_stages(self):
        """测试有阶段时 is_multi_stage 为 True"""
        policy = LifecyclePolicy(
            enabled=True,
            stages=[
                LifecycleStage(start_day=1, end_day=7, storage_class=StorageClass.STANDARD),
                LifecycleStage(start_day=8, end_day=30, storage_class=StorageClass.GLACIER_IR),
            ],
        )
        assert policy.is_multi_stage is True

    def test_is_multi_stage_without_stages(self):
        """测试无阶段时 is_multi_stage 为 False"""
        policy = LifecyclePolicy(
            enabled=True,
            transition_days=7,
            target_class=StorageClass.GLACIER_IR,
        )
        assert policy.is_multi_stage is False

    def test_is_multi_stage_empty_stages(self):
        """测试空阶段列表时 is_multi_stage 为 False"""
        policy = LifecyclePolicy(
            enabled=True,
            stages=[],
        )
        assert policy.is_multi_stage is False

    def test_backward_compatible_policy(self):
        """测试向后兼容的简单策略"""
        policy = LifecyclePolicy(
            enabled=True,
            transition_days=7,
            target_class=StorageClass.GLACIER_IR,
        )
        assert policy.enabled is True
        assert policy.transition_days == 7
        assert policy.target_class == StorageClass.GLACIER_IR


class TestMultiStageCalculation:
    """多阶段计算测试"""

    @pytest.fixture
    def multi_stage_input(self):
        """多阶段输入示例"""
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                video_quality="1080p",
                events_per_day=400,
                event_duration_sec=15,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    stages=[
                        LifecycleStage(start_day=1, end_day=7, storage_class=StorageClass.STANDARD),
                        LifecycleStage(start_day=8, end_day=30, storage_class=StorageClass.GLACIER_IR),
                    ],
                ),
            ),
            pricing=PricingDimensions(
                region="ap-northeast-1",
                discount_percent=0.0,
            ),
        )

    def test_multi_stage_returns_result(self, multi_stage_input):
        """测试多阶段计算返回结果"""
        calculator = LifecycleCalculator()
        result = calculator.calculate(multi_stage_input)

        assert result.monthly_total > 0
        assert result.breakdown.storage_cost > 0

    def test_multi_stage_has_lifecycle_cost(self, multi_stage_input):
        """测试多阶段有生命周期转换费用"""
        calculator = LifecycleCalculator()
        result = calculator.calculate(multi_stage_input)

        # 从 STANDARD 转换到 GLACIER_IR 有转换费用
        assert result.breakdown.lifecycle_cost > 0

    def test_multi_stage_equivalent_to_simple(self, multi_stage_input):
        """测试多阶段与简单策略等效"""
        calculator = LifecycleCalculator()

        # 多阶段计算
        multi_stage_result = calculator.calculate(multi_stage_input)

        # 简单策略计算
        simple_input = multi_stage_input.model_copy(deep=True)
        simple_input.technical.lifecycle_policy = LifecyclePolicy(
            enabled=True,
            transition_days=7,
            target_class=StorageClass.GLACIER_IR,
        )
        simple_result = calculator.calculate(simple_input)

        # 结果应该接近（可能有细微差异）
        assert abs(multi_stage_result.monthly_total - simple_result.monthly_total) < 1.0

    def test_three_stage_calculation(self):
        """测试三阶段计算"""
        input_data = CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=90,
                access_pattern=0.05,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    stages=[
                        LifecycleStage(start_day=1, end_day=7, storage_class=StorageClass.STANDARD),
                        LifecycleStage(start_day=8, end_day=30, storage_class=StorageClass.GLACIER_IR),
                        LifecycleStage(start_day=31, end_day=90, storage_class=StorageClass.DEEP_ARCHIVE),
                    ],
                ),
            ),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

        calculator = LifecycleCalculator()
        result = calculator.calculate(input_data)

        assert result.monthly_total > 0
        # 三阶段应该有转换费用
        assert result.breakdown.lifecycle_cost > 0

    def test_single_stage_no_transition_cost(self):
        """测试单阶段无转换费用"""
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
                    stages=[
                        LifecycleStage(start_day=1, end_day=30, storage_class=StorageClass.STANDARD),
                    ],
                ),
            ),
            pricing=PricingDimensions(),
        )

        calculator = LifecycleCalculator()
        result = calculator.calculate(input_data)

        # 单阶段纯 STANDARD，无转换费用
        assert result.breakdown.lifecycle_cost == 0


class TestCalculateWithDetails:
    """calculate_with_details 方法测试"""

    @pytest.fixture
    def input_data(self):
        return CostCalculationInput(
            functional=FunctionalDimensions(
                device_count=100,
                recording_mode=RecordingMode.EVENT_TRIGGERED,
                retention_days=30,
                access_pattern=0.1,
            ),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    stages=[
                        LifecycleStage(start_day=1, end_day=7, storage_class=StorageClass.STANDARD),
                        LifecycleStage(start_day=8, end_day=30, storage_class=StorageClass.GLACIER_IR),
                    ],
                ),
            ),
            pricing=PricingDimensions(region="ap-northeast-1"),
        )

    def test_returns_tuple(self, input_data):
        """测试返回元组"""
        calculator = LifecycleCalculator()
        result = calculator.calculate_with_details(input_data)

        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_summary_matches_calculate(self, input_data):
        """测试汇总与 calculate 结果一致"""
        calculator = LifecycleCalculator()

        summary, _ = calculator.calculate_with_details(input_data)
        normal_result = calculator.calculate(input_data)

        assert summary.monthly_total == normal_result.monthly_total

    def test_detailed_breakdown_has_storage_costs(self, input_data):
        """测试详细分解有存储费用"""
        calculator = LifecycleCalculator()
        _, details = calculator.calculate_with_details(input_data)

        assert details.storage_costs is not None
        assert len(details.storage_costs) > 0

    def test_detailed_breakdown_has_stage_breakdowns(self, input_data):
        """测试详细分解有阶段明细"""
        calculator = LifecycleCalculator()
        _, details = calculator.calculate_with_details(input_data)

        assert details.stage_breakdowns is not None
        assert len(details.stage_breakdowns) == 2  # 两个阶段
