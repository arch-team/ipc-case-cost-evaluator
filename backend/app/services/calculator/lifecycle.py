"""生命周期混合策略成本计算器"""
from app.models.dimensions import CostCalculationInput
from app.models.results import CostBreakdown, CostSummary, IntermediateMetrics
from app.models.pricing import PricingLoader
from app.models.enums import StorageClass
from app.services.calculator.base import BaseCalculator


class LifecycleCalculator:
    """
    生命周期混合策略计算器

    支持 Standard → Glacier IR 的生命周期转换计算。
    数据在指定天数后自动从 Standard 转换到 Glacier IR。
    """

    def calculate(self, input_data: CostCalculationInput) -> CostSummary:
        """
        计算生命周期混合策略成本

        Args:
            input_data: 三类维度输入

        Returns:
            成本计算汇总

        Raises:
            ValueError: 当生命周期策略未启用时
        """
        functional = input_data.functional
        technical = input_data.technical
        pricing_dims = input_data.pricing

        # 验证生命周期策略已启用
        if not technical.lifecycle_policy or not technical.lifecycle_policy.enabled:
            raise ValueError("生命周期策略未启用")

        lifecycle = technical.lifecycle_policy
        transition_days = lifecycle.transition_days
        target_class = lifecycle.target_class
        retention_days = functional.retention_days

        # 加载定价数据
        pricing = PricingLoader.load(pricing_dims.region)
        discount = pricing_dims.discount_percent

        # 计算中间指标
        daily_data_gb = BaseCalculator.calculate_daily_data_gb(functional)
        monthly_puts = BaseCalculator.calculate_monthly_puts(functional, daily_data_gb)
        monthly_gets = BaseCalculator.calculate_monthly_gets(functional, monthly_puts)
        monthly_retrieval_gb = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data_gb,
            functional.access_pattern,
        )
        monthly_transfer_gb = BaseCalculator.calculate_monthly_transfer_gb(
            monthly_retrieval_gb,
        )

        # 计算热/冷存储比例
        # 数据在 Standard 存储的天数
        hot_days = min(transition_days, retention_days)
        # 数据在 Glacier 存储的天数
        cold_days = max(0, retention_days - transition_days)

        # 计算各部分存储量
        # 热存储: 前 transition_days 天的数据在 Standard
        hot_storage_gb = daily_data_gb * hot_days
        # 冷存储: transition_days 天之后的数据在 Glacier
        cold_storage_gb = daily_data_gb * cold_days

        # 总平均存储量
        avg_storage_gb = hot_storage_gb + cold_storage_gb

        # 计算存储费用 (混合)
        hot_storage_cost = (
            hot_storage_gb
            * pricing.get_storage_price(StorageClass.STANDARD)
            * (1 - discount)
        )
        cold_storage_cost = (
            cold_storage_gb
            * pricing.get_storage_price(target_class)
            * (1 - discount)
        )
        storage_cost = hot_storage_cost + cold_storage_cost

        # PUT 请求费用
        # 所有数据先写入 Standard
        put_cost = (
            (monthly_puts / 1000)
            * pricing.get_put_price(StorageClass.STANDARD)
            * (1 - discount)
        )

        # GET 请求费用
        # 假设访问主要是近期数据 (Standard) 或已转换的数据 (Glacier)
        # 简化计算: 按存储比例分配 GET 请求
        if retention_days > 0:
            hot_ratio = hot_days / retention_days
            cold_ratio = cold_days / retention_days
        else:
            hot_ratio = 1.0
            cold_ratio = 0.0

        hot_gets = monthly_gets * hot_ratio
        cold_gets = monthly_gets * cold_ratio

        get_cost = (
            (hot_gets / 1000)
            * pricing.get_get_price(StorageClass.STANDARD)
            * (1 - discount)
        ) + (
            (cold_gets / 1000)
            * pricing.get_get_price(target_class)
            * (1 - discount)
        )

        # 检索费用 (只有 Glacier 部分有检索费用)
        cold_retrieval_gb = monthly_retrieval_gb * cold_ratio
        retrieval_cost = (
            cold_retrieval_gb
            * pricing.get_retrieval_price(target_class)
            * (1 - discount)
        )

        # 数据传输费用
        transfer_cost = (
            monthly_transfer_gb
            * pricing.get_data_transfer_price(monthly_transfer_gb)
            * (1 - discount)
        )

        # 生命周期转换费用
        # 每月转换的对象数 = 每天的 PUT 数量 * 30
        # (每天的数据都会在 transition_days 后被转换)
        daily_puts = monthly_puts / 30
        monthly_transitions = daily_puts * 30  # 每月有 30 天的数据需要转换

        lifecycle_cost = (
            (monthly_transitions / 1000)
            * pricing.get_lifecycle_price(target_class)
            * (1 - discount)
        )

        # 构建结果
        breakdown = CostBreakdown(
            storage_cost=storage_cost,
            put_request_cost=put_cost,
            get_request_cost=get_cost,
            retrieval_cost=retrieval_cost,
            data_transfer_cost=transfer_cost,
            lifecycle_cost=lifecycle_cost,
        )

        metrics = IntermediateMetrics(
            daily_data_gb=daily_data_gb,
            avg_storage_gb=avg_storage_gb,
            monthly_puts=monthly_puts,
            monthly_gets=monthly_gets,
            monthly_retrieval_gb=monthly_retrieval_gb,
            monthly_transfer_gb=monthly_transfer_gb,
        )

        monthly_total = breakdown.total
        per_device_monthly = monthly_total / functional.device_count

        return CostSummary(
            monthly_total=monthly_total,
            per_device_monthly=per_device_monthly,
            breakdown=breakdown,
            device_count=functional.device_count,
            metrics=metrics,
        )
