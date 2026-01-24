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
from app.models.dimensions import CostCalculationInput, FunctionalDimensions
from app.models.results import CostBreakdown, CostSummary, IntermediateMetrics
from app.models.pricing import PricingLoader, S3Pricing
from app.models.enums import StorageClass
from app.services.calculator.base import BaseCalculator


class S3StandardCalculator:
    """S3 Standard 存储类型计算器

    计算使用 S3 Standard 存储类型时的完整成本。
    S3 Standard 适合频繁访问的数据，具有最低的延迟和最高的吞吐量。

    使用方法:
        calculator = S3StandardCalculator()
        result = calculator.calculate(input_data)

    计算流程:
        1. 加载区域定价数据
        2. 计算中间指标（数据量、请求数等）
        3. 计算各项费用
        4. 应用折扣
        5. 汇总返回结果
    """

    def _calculate_metrics(self, functional: FunctionalDimensions) -> IntermediateMetrics:
        """计算中间指标

        Args:
            functional: 功能维度配置

        Returns:
            中间计算指标
        """
        daily_data_gb = BaseCalculator.calculate_daily_data_gb(functional)
        avg_storage_gb = BaseCalculator.calculate_avg_storage_gb(
            daily_data_gb, functional.retention_days
        )
        monthly_puts = BaseCalculator.calculate_monthly_puts(functional, daily_data_gb)
        monthly_gets = BaseCalculator.calculate_monthly_gets(functional, monthly_puts)
        monthly_retrieval_gb = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data_gb, functional.access_pattern
        )
        monthly_transfer_gb = BaseCalculator.calculate_monthly_transfer_gb(
            monthly_retrieval_gb
        )

        return IntermediateMetrics(
            daily_data_gb=daily_data_gb,
            avg_storage_gb=avg_storage_gb,
            monthly_puts=monthly_puts,
            monthly_gets=monthly_gets,
            monthly_retrieval_gb=monthly_retrieval_gb,
            monthly_transfer_gb=monthly_transfer_gb,
        )

    def _calculate_costs(
        self,
        metrics: IntermediateMetrics,
        pricing: S3Pricing,
        storage_class: StorageClass,
        discount: float,
    ) -> CostBreakdown:
        """计算各项费用

        Args:
            metrics: 中间指标
            pricing: 定价信息
            storage_class: 存储类型
            discount: 折扣比例

        Returns:
            费用明细
        """
        # 应用折扣的乘数
        discount_multiplier = 1 - discount

        # 计算各项费用
        storage_cost = (
            metrics.avg_storage_gb * pricing.get_storage_price(storage_class) * discount_multiplier
        )
        put_cost = (
            (metrics.monthly_puts / 1000) * pricing.get_put_price(storage_class) * discount_multiplier
        )
        get_cost = (
            (metrics.monthly_gets / 1000) * pricing.get_get_price(storage_class) * discount_multiplier
        )
        transfer_cost = (
            metrics.monthly_transfer_gb
            * pricing.get_data_transfer_price(metrics.monthly_transfer_gb)
            * discount_multiplier
        )

        return CostBreakdown(
            storage_cost=storage_cost,
            put_request_cost=put_cost,
            get_request_cost=get_cost,
            retrieval_cost=0.0,  # S3 Standard 没有检索费用
            data_transfer_cost=transfer_cost,
            lifecycle_cost=0.0,  # S3 Standard 不需要生命周期转换
        )

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
        # 加载定价数据
        pricing = PricingLoader.load(input_data.pricing.region)
        storage_class = StorageClass.STANDARD

        # 计算中间指标
        metrics = self._calculate_metrics(input_data.functional)

        # 计算各项费用
        breakdown = self._calculate_costs(
            metrics,
            pricing,
            storage_class,
            input_data.pricing.discount_percent,
        )

        # 计算汇总
        monthly_total = breakdown.total
        per_device_monthly = monthly_total / input_data.functional.device_count

        return CostSummary(
            monthly_total=monthly_total,
            per_device_monthly=per_device_monthly,
            breakdown=breakdown,
            device_count=input_data.functional.device_count,
            metrics=metrics,
        )
