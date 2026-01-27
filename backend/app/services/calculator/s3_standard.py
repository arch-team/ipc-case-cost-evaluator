"""S3 通用存储成本计算器

实现所有 S3 单一存储类型的完整成本计算，包括：
- 存储费用
- PUT/GET 请求费用
- 数据检索费用（针对有检索费用的存储类型）
- 数据传输费用

支持的存储类型：
- STANDARD: 频繁访问，无检索费用
- INTELLIGENT_TIERING: 智能分层，自动优化
- STANDARD_IA: 不频繁访问，有检索费用
- ONEZONE_IA: 单可用区不频繁访问
- GLACIER_IR: 即时检索归档
- GLACIER_FR: 灵活检索归档
- DEEP_ARCHIVE: 深度归档
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
    """S3 通用存储类型计算器

    计算使用任意单一 S3 存储类型时的完整成本。
    支持所有 AWS S3 存储类型，根据输入参数中的 storage_class 进行计算。

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
        3. 根据 storage_class 计算各项费用
        4. 应用折扣
        5. 汇总返回结果
    """

    # _get_pricing、_calculate_metrics 和 _calculate_storage_costs 方法继承自 BaseCalculator

    def calculate(self, input_data: CostCalculationInput) -> CostSummary:
        """计算 S3 存储成本

        Args:
            input_data: 包含功能维度、技术维度和价格维度的完整输入

        Returns:
            CostSummary: 包含月度/年度成本、费用明细和中间指标的完整结果

        计算公式:
            存储费用 = 平均存储量 x 存储单价 x (1 - 折扣)
            PUT 费用 = (月度 PUT 数 / 1000) x PUT 单价 x (1 - 折扣)
            GET 费用 = (月度 GET 数 / 1000) x GET 单价 x (1 - 折扣)
            检索费用 = 月度检索量 x 检索单价 x (1 - 折扣)（仅部分类型）
            传输费用 = 月度传输量 x 传输单价 x (1 - 折扣)
        """
        # 获取定价数据和计算中间指标
        pricing = self._get_pricing(input_data.pricing.region)
        metrics = self._calculate_metrics(input_data.functional)

        # 使用基类方法计算费用，使用输入参数中的存储类型
        breakdown = self._calculate_storage_costs(
            metrics,
            pricing,
            input_data.technical.storage_class,
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
