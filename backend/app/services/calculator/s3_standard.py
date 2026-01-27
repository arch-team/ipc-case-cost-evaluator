"""S3 Standard 存储成本计算器

实现 S3 Standard 存储类型的完整成本计算，包括：
- 存储费用
- PUT/GET 请求费用
- 数据传输费用

S3 Standard 特点：
- 没有数据检索费用
- 没有生命周期转换费用
- 适合频繁访问的数据
"""
from typing import TYPE_CHECKING, Optional

from app.models.dimensions import CostCalculationInput
from app.models.results import CostBreakdown, CostSummary, IntermediateMetrics
from app.models.pricing import S3Pricing
from app.models.enums import StorageClass
from app.services.calculator.base import BaseCalculator

if TYPE_CHECKING:
    from app.services.pricing_service import PricingService


class S3StandardCalculator(BaseCalculator):
    """S3 Standard 存储类型计算器

    计算使用 S3 Standard 存储类型时的完整成本。
    S3 Standard 适合频繁访问的数据，具有最低的延迟和最高的吞吐量。

    继承自 BaseCalculator，复用定价服务访问和中间指标计算。

    使用方法:
        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

        # 使用自定义 PricingService
        from app.services.pricing_service import get_pricing_service
        calculator = S3StandardCalculator(get_pricing_service())

    计算流程:
        1. 从 PricingService 获取区域定价数据
        2. 计算中间指标（数据量、请求数等）
        3. 计算各项费用
        4. 应用折扣
        5. 汇总返回结果
    """

    # _get_pricing、_calculate_metrics 和 _calculate_storage_costs 方法继承自 BaseCalculator

    def calculate(self, input_data: CostCalculationInput) -> CostSummary:
        """计算 S3 Standard 存储成本

        Args:
            input_data: 包含功能维度、技术维度和价格维度的完整输入

        Returns:
            CostSummary: 包含月度/年度成本、费用明细和中间指标的完整结果

        计算公式:
            存储费用 = 平均存储量 x 存储单价 x (1 - 折扣)
            PUT 费用 = (月度 PUT 数 / 1000) x PUT 单价 x (1 - 折扣)
            GET 费用 = (月度 GET 数 / 1000) x GET 单价 x (1 - 折扣)
            传输费用 = 月度传输量 x 传输单价 x (1 - 折扣)
        """
        # 获取定价数据和计算中间指标
        pricing = self._get_pricing(input_data.pricing.region)
        metrics = self._calculate_metrics(input_data.functional)

        # 使用基类方法计算费用
        breakdown = self._calculate_storage_costs(
            metrics,
            pricing,
            StorageClass.STANDARD,
            input_data.pricing.discount_percent,
        )

        # 返回成本汇总
        return CostSummary(
            monthly_total=breakdown.total,
            per_device_monthly=breakdown.total / input_data.functional.device_count,
            breakdown=breakdown,
            device_count=input_data.functional.device_count,
            metrics=metrics,
        )
