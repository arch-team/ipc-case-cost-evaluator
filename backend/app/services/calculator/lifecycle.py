"""生命周期混合策略成本计算器

支持多阶段生命周期配置的成本计算。
"""
from datetime import datetime
from typing import List, Optional, Tuple

from app.models.dimensions import CostCalculationInput, LifecycleStage
from app.models.enums import StorageClass
from app.models.pricing import PricingLoader, S3Pricing
from app.models.results import (
    CostBreakdown,
    CostItem,
    CostSummary,
    DetailedCostBreakdown,
    IntermediateMetrics,
    PricingMetadata,
    StageCostBreakdown,
    TierDetail,
)
from app.services.calculator.base import BaseCalculator


class LifecycleCalculator:
    """生命周期混合策略计算器

    支持两种模式:
    1. 简单模式: Standard → 目标存储类型的两阶段转换
    2. 多阶段模式: 自定义多个存储阶段

    Attributes:
        _pricing: 当前使用的定价数据
        _discount: 折扣比例
    """

    def __init__(self):
        self._pricing: Optional[S3Pricing] = None
        self._discount: float = 0.0

    def calculate(self, input_data: CostCalculationInput) -> CostSummary:
        """计算生命周期混合策略成本

        根据生命周期策略的配置选择简单模式或多阶段模式。

        Args:
            input_data: 三类维度输入

        Returns:
            成本计算汇总

        Raises:
            ValueError: 当生命周期策略未启用时
        """
        technical = input_data.technical
        lifecycle = technical.lifecycle_policy

        # 验证生命周期策略已启用
        if not lifecycle or not lifecycle.enabled:
            raise ValueError("生命周期策略未启用")

        # 加载定价数据
        self._pricing = PricingLoader.load(input_data.pricing.region)
        self._discount = input_data.pricing.discount_percent

        # 选择计算模式
        if lifecycle.is_multi_stage:
            return self._calculate_multi_stage(input_data)
        else:
            return self._calculate_simple(input_data)

    def calculate_with_details(
        self, input_data: CostCalculationInput
    ) -> Tuple[CostSummary, DetailedCostBreakdown]:
        """计算成本并返回详细明细

        Args:
            input_data: 三类维度输入

        Returns:
            (CostSummary, DetailedCostBreakdown) 元组
        """
        technical = input_data.technical
        lifecycle = technical.lifecycle_policy

        if not lifecycle or not lifecycle.enabled:
            raise ValueError("生命周期策略未启用")

        self._pricing = PricingLoader.load(input_data.pricing.region)
        self._discount = input_data.pricing.discount_percent

        if lifecycle.is_multi_stage:
            return self._calculate_multi_stage_with_details(input_data)
        else:
            return self._calculate_simple_with_details(input_data)

    def _calculate_multi_stage(self, input_data: CostCalculationInput) -> CostSummary:
        """多阶段模式计算"""
        summary, _ = self._calculate_multi_stage_with_details(input_data)
        return summary

    def _calculate_multi_stage_with_details(
        self, input_data: CostCalculationInput
    ) -> Tuple[CostSummary, DetailedCostBreakdown]:
        """多阶段模式计算（含详细明细）"""
        functional = input_data.functional
        lifecycle = input_data.technical.lifecycle_policy
        stages = lifecycle.stages

        # 计算基础指标
        daily_data_gb = BaseCalculator.calculate_daily_data_gb(functional)
        monthly_puts = BaseCalculator.calculate_monthly_puts(functional, daily_data_gb)
        monthly_gets = BaseCalculator.calculate_monthly_gets(functional, monthly_puts)
        monthly_retrieval_gb = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data_gb, functional.access_pattern
        )
        monthly_transfer_gb = BaseCalculator.calculate_monthly_transfer_gb(
            monthly_retrieval_gb
        )

        total_days = stages[-1].end_day
        stage_breakdowns: List[StageCostBreakdown] = []
        storage_cost_items: List[CostItem] = []

        total_storage_cost = 0.0
        total_put_cost = 0.0
        total_get_cost = 0.0
        total_retrieval_cost = 0.0
        total_lifecycle_cost = 0.0

        for i, stage in enumerate(stages):
            stage_breakdown = self._calculate_stage_cost(
                stage=stage,
                daily_data_gb=daily_data_gb,
                monthly_puts=monthly_puts,
                monthly_gets=monthly_gets,
                monthly_retrieval_gb=monthly_retrieval_gb,
                total_days=total_days,
                is_first_stage=(i == 0),
            )
            stage_breakdowns.append(stage_breakdown)

            # 累计各项费用
            total_storage_cost += stage_breakdown.storage_cost.amount
            total_put_cost += stage_breakdown.request_cost.amount
            if stage_breakdown.retrieval_cost:
                total_retrieval_cost += stage_breakdown.retrieval_cost.amount
            if stage_breakdown.transition_cost:
                total_lifecycle_cost += stage_breakdown.transition_cost.amount

            # 添加存储费用明细
            storage_cost_items.append(stage_breakdown.storage_cost)

        # 计算 GET 请求费用（分配到各阶段）
        get_cost_item = self._calculate_get_cost_item(
            stages, monthly_gets, total_days
        )
        total_get_cost = get_cost_item.amount

        # 计算数据传输费用（含阶梯明细）
        transfer_cost_item = self._calculate_transfer_cost_item(monthly_transfer_gb)

        # 构建详细费用明细
        detailed_breakdown = DetailedCostBreakdown(
            storage_costs=storage_cost_items,
            put_request_cost=self._create_put_cost_item(monthly_puts),
            get_request_cost=get_cost_item,
            retrieval_cost=self._create_retrieval_cost_item(
                monthly_retrieval_gb, stages, total_days
            ),
            data_transfer_cost=transfer_cost_item,
            lifecycle_cost=self._create_lifecycle_cost_item(
                monthly_puts, stages
            ),
            stage_breakdowns=stage_breakdowns,
            pricing_metadata=PricingMetadata(
                source="LOCAL_FALLBACK",
                updated_at=datetime.now(),
                region=self._pricing.region,
                is_fallback=True,
            ),
        )

        # 构建汇总
        monthly_total = detailed_breakdown.total
        breakdown = CostBreakdown(
            storage_cost=total_storage_cost,
            put_request_cost=total_put_cost,
            get_request_cost=total_get_cost,
            retrieval_cost=total_retrieval_cost,
            data_transfer_cost=transfer_cost_item.amount,
            lifecycle_cost=total_lifecycle_cost,
        )

        metrics = IntermediateMetrics(
            daily_data_gb=daily_data_gb,
            avg_storage_gb=daily_data_gb * total_days,
            monthly_puts=monthly_puts,
            monthly_gets=monthly_gets,
            monthly_retrieval_gb=monthly_retrieval_gb,
            monthly_transfer_gb=monthly_transfer_gb,
        )

        summary = CostSummary(
            monthly_total=monthly_total,
            per_device_monthly=monthly_total / functional.device_count,
            breakdown=breakdown,
            device_count=functional.device_count,
            metrics=metrics,
        )

        return summary, detailed_breakdown

    def _calculate_stage_cost(
        self,
        stage: LifecycleStage,
        daily_data_gb: float,
        monthly_puts: float,
        monthly_gets: float,
        monthly_retrieval_gb: float,
        total_days: int,
        is_first_stage: bool,
    ) -> StageCostBreakdown:
        """计算单个阶段的成本

        Args:
            stage: 生命周期阶段
            daily_data_gb: 每日数据量
            monthly_puts: 月度 PUT 请求数
            monthly_gets: 月度 GET 请求数
            monthly_retrieval_gb: 月度检索量
            total_days: 总保留天数
            is_first_stage: 是否为第一阶段

        Returns:
            StageCostBreakdown: 阶段成本明细
        """
        storage_class = stage.storage_class
        duration_days = stage.duration_days
        day_ratio = duration_days / total_days

        # 存储费用
        stage_storage_gb = daily_data_gb * duration_days
        storage_price = self._pricing.get_storage_price(storage_class)
        storage_amount = stage_storage_gb * storage_price * (1 - self._discount)

        storage_cost = CostItem(
            name=f"{storage_class.value} 存储",
            unit_price=storage_price,
            unit_price_unit="USD/GB-月",
            quantity=stage_storage_gb,
            quantity_unit="GB",
            amount=round(storage_amount, 4),
        )

        # PUT 请求费用（只在第一阶段计算，所有数据都先写入）
        if is_first_stage:
            put_price = self._pricing.get_put_price(storage_class)
            put_amount = (monthly_puts / 1000) * put_price * (1 - self._discount)
            request_cost = CostItem(
                name="PUT 请求",
                unit_price=put_price,
                unit_price_unit="USD/千次",
                quantity=monthly_puts / 1000,
                quantity_unit="千次",
                amount=round(put_amount, 4),
            )
        else:
            request_cost = CostItem(
                name="PUT 请求",
                unit_price=0,
                unit_price_unit="USD/千次",
                quantity=0,
                quantity_unit="千次",
                amount=0,
            )

        # 检索费用（非 Standard 存储类型）
        retrieval_cost = None
        if storage_class != StorageClass.STANDARD:
            retrieval_price = self._pricing.get_retrieval_price(storage_class)
            if retrieval_price > 0:
                stage_retrieval_gb = monthly_retrieval_gb * day_ratio
                retrieval_amount = (
                    stage_retrieval_gb * retrieval_price * (1 - self._discount)
                )
                retrieval_cost = CostItem(
                    name=f"{storage_class.value} 检索",
                    unit_price=retrieval_price,
                    unit_price_unit="USD/GB",
                    quantity=stage_retrieval_gb,
                    quantity_unit="GB",
                    amount=round(retrieval_amount, 4),
                )

        # 生命周期转换费用（非第一阶段）
        transition_cost = None
        if not is_first_stage:
            transition_price = self._pricing.get_lifecycle_price(storage_class)
            if transition_price > 0:
                daily_puts = monthly_puts / 30
                monthly_transitions = daily_puts * 30
                transition_amount = (
                    (monthly_transitions / 1000)
                    * transition_price
                    * (1 - self._discount)
                )
                transition_cost = CostItem(
                    name=f"转换到 {storage_class.value}",
                    unit_price=transition_price,
                    unit_price_unit="USD/千次",
                    quantity=monthly_transitions / 1000,
                    quantity_unit="千次",
                    amount=round(transition_amount, 4),
                )

        return StageCostBreakdown(
            start_day=stage.start_day,
            end_day=stage.end_day,
            storage_class=storage_class,
            duration_days=duration_days,
            storage_cost=storage_cost,
            request_cost=request_cost,
            retrieval_cost=retrieval_cost,
            transition_cost=transition_cost,
        )

    def _calculate_get_cost_item(
        self,
        stages: List[LifecycleStage],
        monthly_gets: float,
        total_days: int,
    ) -> CostItem:
        """计算 GET 请求费用（按阶段比例分配）"""
        total_get_cost = 0.0
        weighted_price = 0.0

        for stage in stages:
            day_ratio = stage.duration_days / total_days
            stage_gets = monthly_gets * day_ratio
            get_price = self._pricing.get_get_price(stage.storage_class)
            stage_cost = (stage_gets / 1000) * get_price * (1 - self._discount)
            total_get_cost += stage_cost
            weighted_price += get_price * day_ratio

        return CostItem(
            name="GET 请求",
            unit_price=round(weighted_price, 6),
            unit_price_unit="USD/千次 (加权)",
            quantity=monthly_gets / 1000,
            quantity_unit="千次",
            amount=round(total_get_cost, 4),
        )

    def _calculate_transfer_cost_item(self, monthly_transfer_gb: float) -> CostItem:
        """计算数据传输费用（含阶梯明细）"""
        tiers = self._calculate_transfer_tiers(monthly_transfer_gb)
        total_cost = sum(t.amount for t in tiers)

        # 计算平均单价
        avg_price = total_cost / monthly_transfer_gb if monthly_transfer_gb > 0 else 0

        return CostItem(
            name="数据传输出站",
            unit_price=round(avg_price, 6),
            unit_price_unit="USD/GB (平均)",
            quantity=monthly_transfer_gb,
            quantity_unit="GB",
            amount=round(total_cost, 4),
            tiers=tiers,
        )

    def _calculate_transfer_tiers(self, total_gb: float) -> List[TierDetail]:
        """计算数据传输阶梯明细"""
        tiers = []
        remaining_gb = total_gb
        transfer = self._pricing.data_transfer

        tier_configs = [
            ("前 10TB", 0, 10 * 1024, transfer.out_first_10tb_per_gb),
            ("10-50TB", 10 * 1024, 50 * 1024, transfer.out_next_40tb_per_gb),
            ("50-150TB", 50 * 1024, 150 * 1024, transfer.out_next_100tb_per_gb),
            ("150TB 以上", 150 * 1024, None, transfer.out_over_150tb_per_gb),
        ]

        for tier_name, start, end, price in tier_configs:
            if remaining_gb <= 0:
                break

            tier_capacity = (end - start) if end else float("inf")
            tier_usage = min(remaining_gb, tier_capacity)
            tier_cost = tier_usage * price * (1 - self._discount)

            tiers.append(
                TierDetail(
                    tier_name=tier_name,
                    range_start_gb=start,
                    range_end_gb=end,
                    unit_price=price,
                    quantity_gb=round(tier_usage, 2),
                    amount=round(tier_cost, 4),
                )
            )

            remaining_gb -= tier_usage

        return tiers

    def _create_put_cost_item(self, monthly_puts: float) -> CostItem:
        """创建 PUT 请求费用项"""
        put_price = self._pricing.get_put_price(StorageClass.STANDARD)
        put_amount = (monthly_puts / 1000) * put_price * (1 - self._discount)

        return CostItem(
            name="PUT 请求",
            unit_price=put_price,
            unit_price_unit="USD/千次",
            quantity=monthly_puts / 1000,
            quantity_unit="千次",
            amount=round(put_amount, 4),
        )

    def _create_retrieval_cost_item(
        self,
        monthly_retrieval_gb: float,
        stages: List[LifecycleStage],
        total_days: int,
    ) -> Optional[CostItem]:
        """创建检索费用项"""
        total_retrieval_cost = 0.0
        weighted_price = 0.0
        has_retrieval = False

        for stage in stages:
            if stage.storage_class == StorageClass.STANDARD:
                continue

            retrieval_price = self._pricing.get_retrieval_price(stage.storage_class)
            if retrieval_price > 0:
                has_retrieval = True
                day_ratio = stage.duration_days / total_days
                stage_retrieval_gb = monthly_retrieval_gb * day_ratio
                stage_cost = (
                    stage_retrieval_gb * retrieval_price * (1 - self._discount)
                )
                total_retrieval_cost += stage_cost
                weighted_price += retrieval_price * day_ratio

        if not has_retrieval:
            return None

        return CostItem(
            name="数据检索",
            unit_price=round(weighted_price, 6),
            unit_price_unit="USD/GB (加权)",
            quantity=monthly_retrieval_gb,
            quantity_unit="GB",
            amount=round(total_retrieval_cost, 4),
        )

    def _create_lifecycle_cost_item(
        self,
        monthly_puts: float,
        stages: List[LifecycleStage],
    ) -> Optional[CostItem]:
        """创建生命周期转换费用项"""
        total_lifecycle_cost = 0.0
        total_transitions = 0.0
        has_transitions = False

        daily_puts = monthly_puts / 30
        monthly_transitions = daily_puts * 30

        for stage in stages[1:]:  # 跳过第一阶段
            transition_price = self._pricing.get_lifecycle_price(stage.storage_class)
            if transition_price > 0:
                has_transitions = True
                stage_cost = (
                    (monthly_transitions / 1000)
                    * transition_price
                    * (1 - self._discount)
                )
                total_lifecycle_cost += stage_cost
                total_transitions += monthly_transitions

        if not has_transitions:
            return None

        return CostItem(
            name="生命周期转换",
            unit_price=0,  # 各阶段价格不同
            unit_price_unit="USD/千次 (混合)",
            quantity=total_transitions / 1000,
            quantity_unit="千次",
            amount=round(total_lifecycle_cost, 4),
        )

    # ========================================
    # 简单模式计算（保持向后兼容）
    # ========================================

    def _calculate_simple(self, input_data: CostCalculationInput) -> CostSummary:
        """简单模式计算（两阶段转换）"""
        functional = input_data.functional
        lifecycle = input_data.technical.lifecycle_policy

        transition_days = lifecycle.transition_days
        target_class = lifecycle.target_class
        retention_days = functional.retention_days

        # 计算中间指标
        daily_data_gb = BaseCalculator.calculate_daily_data_gb(functional)
        monthly_puts = BaseCalculator.calculate_monthly_puts(functional, daily_data_gb)
        monthly_gets = BaseCalculator.calculate_monthly_gets(functional, monthly_puts)
        monthly_retrieval_gb = BaseCalculator.calculate_monthly_retrieval_gb(
            daily_data_gb, functional.access_pattern
        )
        monthly_transfer_gb = BaseCalculator.calculate_monthly_transfer_gb(
            monthly_retrieval_gb
        )

        # 计算热/冷存储比例
        hot_days = min(transition_days, retention_days)
        cold_days = max(0, retention_days - transition_days)

        # 计算各部分存储量
        hot_storage_gb = daily_data_gb * hot_days
        cold_storage_gb = daily_data_gb * cold_days
        avg_storage_gb = hot_storage_gb + cold_storage_gb

        # 计算存储费用
        hot_storage_cost = (
            hot_storage_gb
            * self._pricing.get_storage_price(StorageClass.STANDARD)
            * (1 - self._discount)
        )
        cold_storage_cost = (
            cold_storage_gb
            * self._pricing.get_storage_price(target_class)
            * (1 - self._discount)
        )
        storage_cost = hot_storage_cost + cold_storage_cost

        # PUT 请求费用
        put_cost = (
            (monthly_puts / 1000)
            * self._pricing.get_put_price(StorageClass.STANDARD)
            * (1 - self._discount)
        )

        # GET 请求费用
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
            * self._pricing.get_get_price(StorageClass.STANDARD)
            * (1 - self._discount)
        ) + (
            (cold_gets / 1000)
            * self._pricing.get_get_price(target_class)
            * (1 - self._discount)
        )

        # 检索费用
        cold_retrieval_gb = monthly_retrieval_gb * cold_ratio
        retrieval_cost = (
            cold_retrieval_gb
            * self._pricing.get_retrieval_price(target_class)
            * (1 - self._discount)
        )

        # 数据传输费用
        transfer_cost = (
            monthly_transfer_gb
            * self._pricing.get_data_transfer_price(monthly_transfer_gb)
            * (1 - self._discount)
        )

        # 生命周期转换费用
        daily_puts = monthly_puts / 30
        monthly_transitions = daily_puts * 30
        lifecycle_cost = (
            (monthly_transitions / 1000)
            * self._pricing.get_lifecycle_price(target_class)
            * (1 - self._discount)
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

    def _calculate_simple_with_details(
        self, input_data: CostCalculationInput
    ) -> Tuple[CostSummary, DetailedCostBreakdown]:
        """简单模式计算（含详细明细）"""
        # 转换为多阶段模式计算
        functional = input_data.functional
        lifecycle = input_data.technical.lifecycle_policy

        transition_days = lifecycle.transition_days
        target_class = lifecycle.target_class
        retention_days = functional.retention_days

        # 创建等效的多阶段配置
        stages = [
            LifecycleStage(
                start_day=1,
                end_day=min(transition_days, retention_days),
                storage_class=StorageClass.STANDARD,
            )
        ]

        if retention_days > transition_days:
            stages.append(
                LifecycleStage(
                    start_day=transition_days + 1,
                    end_day=retention_days,
                    storage_class=target_class,
                )
            )

        # 临时设置多阶段配置
        original_stages = lifecycle.stages
        lifecycle.stages = stages

        try:
            result = self._calculate_multi_stage_with_details(input_data)
        finally:
            lifecycle.stages = original_stages

        return result
