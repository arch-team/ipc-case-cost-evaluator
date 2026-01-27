"""S3 Glacier IR 存储成本计算器

实现 S3 Glacier Instant Retrieval 存储类型的完整成本计算，包括：
- 存储费用（比 Standard 更低）
- PUT/GET 请求费用（比 Standard 更高）
- 数据检索费用（Standard 没有，Glacier 有）
- 数据传输费用

S3 Glacier IR 特点：
- 存储费用约为 Standard 的 1/4
- PUT 请求费用约为 Standard 的 5-6 倍
- GET 请求费用比 Standard 高
- 有数据检索费用 ($0.03/GB)
- 适合长期存储、低频访问的数据
"""
from typing import TYPE_CHECKING, Optional

from app.models.dimensions import CostCalculationInput
from app.models.results import CostBreakdown, CostSummary
from app.models.enums import StorageClass
from app.services.calculator.base import BaseCalculator

if TYPE_CHECKING:
    from app.services.pricing_service import PricingService


class S3GlacierCalculator(BaseCalculator):
    """S3 Glacier Instant Retrieval 存储类型计算器

    计算使用 S3 Glacier IR 存储类型时的完整成本。
    S3 Glacier IR 适合需要即时访问但访问频率较低的数据，
    如视频监控归档数据。

    继承自 BaseCalculator，复用定价服务访问和中间指标计算。

    使用方法:
        calculator = S3GlacierCalculator()
        result = calculator.calculate(input_data)

        # 使用自定义 PricingService
        from app.services.pricing_service import get_pricing_service
        calculator = S3GlacierCalculator(get_pricing_service())

    计算流程:
        1. 从 PricingService 获取区域定价数据
        2. 计算中间指标（数据量、请求数等）
        3. 计算各项费用
        4. 计算检索费用（Glacier 特有）
        5. 应用折扣
        6. 汇总返回结果

    与 S3 Standard 的主要区别:
        - 存储费用更低
        - PUT/GET 请求费用更高
        - 有检索费用（按 GB 计费）
        - 没有生命周期转换费用（直接写入 Glacier）
    """

    # _get_pricing 和 _calculate_metrics 方法继承自 BaseCalculator

    def calculate(self, input_data: CostCalculationInput) -> CostSummary:
        """计算 S3 Glacier IR 存储成本

        Args:
            input_data: 包含功能维度、技术维度和价格维度的完整输入

        Returns:
            CostSummary: 包含月度/年度成本、费用明细和中间指标的完整结果

        计算公式:
            存储费用 = 平均存储量 x 存储单价 x (1 - 折扣)
            PUT 费用 = (月度 PUT 数 / 1000) x PUT 单价 x (1 - 折扣)
            GET 费用 = (月度 GET 数 / 1000) x GET 单价 x (1 - 折扣)
            检索费用 = 月度检索量 x 检索单价 x (1 - 折扣)
            传输费用 = 月度传输量 x 传输单价 x (1 - 折扣)
        """
        functional = input_data.functional
        pricing_dims = input_data.pricing

        # 获取定价数据（通过基类方法）
        pricing = self._get_pricing(pricing_dims.region)
        storage_class = StorageClass.GLACIER_IR
        discount_multiplier = 1 - pricing_dims.discount_percent

        # 计算中间指标（通过基类方法）
        metrics = self._calculate_metrics(functional)

        # 计算各项费用
        storage_cost = (
            metrics.avg_storage_gb * pricing.get_storage_price(storage_class) * discount_multiplier
        )
        put_cost = (
            (metrics.monthly_puts / 1000)
            * pricing.get_put_price(storage_class)
            * discount_multiplier
        )
        get_cost = (
            (metrics.monthly_gets / 1000)
            * pricing.get_get_price(storage_class)
            * discount_multiplier
        )

        # Glacier IR 有检索费用（按 GB 计费）
        retrieval_cost = (
            metrics.monthly_retrieval_gb
            * pricing.get_retrieval_price(storage_class)
            * discount_multiplier
        )

        # 数据传输费用
        transfer_cost = (
            metrics.monthly_transfer_gb
            * pricing.get_data_transfer_price(metrics.monthly_transfer_gb)
            * discount_multiplier
        )

        # 构建费用明细
        breakdown = CostBreakdown(
            storage_cost=storage_cost,
            put_request_cost=put_cost,
            get_request_cost=get_cost,
            retrieval_cost=retrieval_cost,
            data_transfer_cost=transfer_cost,
            lifecycle_cost=0.0,  # 直接使用 Glacier 不需要生命周期转换费用
        )

        # 计算汇总
        monthly_total = breakdown.total
        per_device_monthly = monthly_total / functional.device_count

        return CostSummary(
            monthly_total=monthly_total,
            per_device_monthly=per_device_monthly,
            breakdown=breakdown,
            device_count=functional.device_count,
            metrics=metrics,
        )
