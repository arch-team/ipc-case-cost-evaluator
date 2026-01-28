"""存储方案对比器"""
from typing import TYPE_CHECKING, Optional

from app.models.dimensions import (
    CostCalculationInput,
    TechnicalDimensions,
    LifecyclePolicy,
)
from app.models.results import (
    ComparisonResult,
    ComparisonItem,
)
from app.models.enums import StorageClass
from app.services.calculator.s3_standard import S3StandardCalculator
from app.services.calculator.s3_glacier import S3GlacierCalculator
from app.services.calculator.lifecycle import LifecycleCalculator

if TYPE_CHECKING:
    from app.services.pricing_service import PricingService


class StorageComparator:
    """
    存储方案对比器

    对比 S3 Standard、Glacier IR 和生命周期混合策略的成本。
    """

    def __init__(self, pricing_service: Optional["PricingService"] = None):
        """初始化对比器

        Args:
            pricing_service: 定价服务实例，None 时使用全局单例
        """
        self.standard_calc = S3StandardCalculator(pricing_service)
        self.glacier_calc = S3GlacierCalculator(pricing_service)
        self.lifecycle_calc = LifecycleCalculator(pricing_service)

    def compare(
        self,
        input_data: CostCalculationInput,
        include_lifecycle: bool = True,
        lifecycle_days: int = 7,
    ) -> ComparisonResult:
        """
        对比不同存储方案

        Args:
            input_data: 三类维度输入
            include_lifecycle: 是否包含生命周期选项
            lifecycle_days: 生命周期转换天数

        Returns:
            方案对比结果
        """
        items = []

        # 1. 计算 S3 Standard 成本 (基准)
        standard_input = self._create_standard_input(input_data)
        standard_result = self.standard_calc.calculate(standard_input)
        baseline_cost = standard_result.monthly_total

        standard_item = ComparisonItem(
            name="S3 Standard",
            storage_class="STANDARD",
            monthly_cost=standard_result.monthly_total,
            yearly_cost=standard_result.yearly_total,
            vs_baseline=0.0,  # 基准
            breakdown=standard_result.breakdown,
            metrics=standard_result.metrics,
            technical=standard_input.technical,
        )
        items.append(standard_item)

        # 2. 计算 S3 Glacier IR 成本
        glacier_input = self._create_glacier_input(input_data)
        glacier_result = self.glacier_calc.calculate(glacier_input)

        glacier_diff = self._calculate_vs_baseline(
            glacier_result.monthly_total, baseline_cost
        )

        glacier_item = ComparisonItem(
            name="S3 Glacier IR",
            storage_class="GLACIER_IR",
            monthly_cost=glacier_result.monthly_total,
            yearly_cost=glacier_result.yearly_total,
            vs_baseline=glacier_diff,
            breakdown=glacier_result.breakdown,
            metrics=glacier_result.metrics,
            technical=glacier_input.technical,
        )
        items.append(glacier_item)

        # 3. 计算生命周期策略成本 (可选)
        if include_lifecycle:
            lifecycle_input = self._create_lifecycle_input(input_data, lifecycle_days)
            lifecycle_result = self.lifecycle_calc.calculate(lifecycle_input)

            lifecycle_diff = self._calculate_vs_baseline(
                lifecycle_result.monthly_total, baseline_cost
            )

            lifecycle_item = ComparisonItem(
                name=f"Standard + Lifecycle ({lifecycle_days}天)",
                storage_class="LIFECYCLE",
                monthly_cost=lifecycle_result.monthly_total,
                yearly_cost=lifecycle_result.yearly_total,
                vs_baseline=lifecycle_diff,
                breakdown=lifecycle_result.breakdown,
                metrics=lifecycle_result.metrics,
                technical=lifecycle_input.technical,
            )
            items.append(lifecycle_item)

        # 标记最优方案
        best_cost = min(item.monthly_cost for item in items)
        for item in items:
            if item.monthly_cost == best_cost:
                item.is_recommended = True

        return ComparisonResult(
            baseline="S3 Standard",
            items=items,
        )

    def _create_standard_input(
        self, input_data: CostCalculationInput
    ) -> CostCalculationInput:
        """创建 Standard 计算输入"""
        return CostCalculationInput(
            functional=input_data.functional.model_copy(deep=True),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=None,
            ),
            pricing=input_data.pricing.model_copy(deep=True),
        )

    def _create_glacier_input(
        self, input_data: CostCalculationInput
    ) -> CostCalculationInput:
        """创建 Glacier IR 计算输入"""
        return CostCalculationInput(
            functional=input_data.functional.model_copy(deep=True),
            technical=TechnicalDimensions(
                storage_class=StorageClass.GLACIER_IR,
                lifecycle_policy=None,
            ),
            pricing=input_data.pricing.model_copy(deep=True),
        )

    def _create_lifecycle_input(
        self, input_data: CostCalculationInput, transition_days: int
    ) -> CostCalculationInput:
        """创建生命周期策略计算输入"""
        return CostCalculationInput(
            functional=input_data.functional.model_copy(deep=True),
            technical=TechnicalDimensions(
                storage_class=StorageClass.STANDARD,
                lifecycle_policy=LifecyclePolicy(
                    enabled=True,
                    transition_days=transition_days,
                    target_class=StorageClass.GLACIER_IR,
                ),
            ),
            pricing=input_data.pricing.model_copy(deep=True),
        )

    @staticmethod
    def _calculate_vs_baseline(cost: float, baseline: float) -> float:
        """计算相对基准的差异比例"""
        if baseline == 0:
            return 0.0
        return (cost - baseline) / baseline
