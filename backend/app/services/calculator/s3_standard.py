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
from datetime import datetime
from typing import TYPE_CHECKING, Optional, Tuple

from app.models.dimensions import CostCalculationInput, LifecycleStage
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

    def calculate_with_details(
        self, input_data: CostCalculationInput
    ) -> Tuple[CostSummary, DetailedCostBreakdown]:
        """计算 S3 存储成本并返回详细明细

        Args:
            input_data: 包含功能维度、技术维度和价格维度的完整输入

        Returns:
            (CostSummary, DetailedCostBreakdown) 元组
        """
        # 获取定价数据和计算中间指标
        pricing = self._get_pricing(input_data.pricing.region)
        metrics = self._calculate_metrics(input_data.functional)
        storage_class = input_data.technical.storage_class
        discount = input_data.pricing.discount_percent
        discount_multiplier = 1 - discount

        # 计算各项费用并构建费用项
        functional = input_data.functional

        # 存储费用
        storage_price = pricing.get_storage_price(storage_class)
        storage_amount = metrics.avg_storage_gb * storage_price * discount_multiplier
        storage_cost_item = CostItem(
            name=f"{storage_class.value} 存储",
            unit_price=storage_price,
            unit_price_unit="USD/GB-月",
            quantity=metrics.avg_storage_gb,
            quantity_unit="GB",
            amount=round(storage_amount, 4),
        )

        # PUT 请求费用
        put_price = pricing.get_put_price(storage_class)
        put_amount = (metrics.monthly_puts / 1000) * put_price * discount_multiplier
        put_cost_item = CostItem(
            name="PUT 请求",
            unit_price=put_price,
            unit_price_unit="USD/千次",
            quantity=metrics.monthly_puts / 1000,
            quantity_unit="千次",
            amount=round(put_amount, 4),
        )

        # GET 请求费用
        get_price = pricing.get_get_price(storage_class)
        get_amount = (metrics.monthly_gets / 1000) * get_price * discount_multiplier
        get_cost_item = CostItem(
            name="GET 请求",
            unit_price=get_price,
            unit_price_unit="USD/千次",
            quantity=metrics.monthly_gets / 1000,
            quantity_unit="千次",
            amount=round(get_amount, 4),
        )

        # 检索费用
        retrieval_cost_item = None
        retrieval_price = pricing.get_retrieval_price(storage_class)
        if retrieval_price > 0:
            retrieval_amount = metrics.monthly_retrieval_gb * retrieval_price * discount_multiplier
            retrieval_cost_item = CostItem(
                name="数据检索",
                unit_price=retrieval_price,
                unit_price_unit="USD/GB",
                quantity=metrics.monthly_retrieval_gb,
                quantity_unit="GB",
                amount=round(retrieval_amount, 4),
            )

        # 数据传输费用（含阶梯明细）
        transfer_cost_item = self._calculate_transfer_cost_item(
            metrics.monthly_transfer_gb, pricing, discount_multiplier
        )

        # 构建单阶段明细（单一存储类型视为全周期单阶段）
        stage_breakdown = StageCostBreakdown(
            start_day=1,
            end_day=functional.retention_days,
            storage_class=storage_class,
            duration_days=functional.retention_days,
            storage_cost=storage_cost_item,
            request_cost=put_cost_item,
            retrieval_cost=retrieval_cost_item,
            transition_cost=None,
        )

        # 构建详细费用明细
        detailed_breakdown = DetailedCostBreakdown(
            storage_costs=[storage_cost_item],
            put_request_cost=put_cost_item,
            get_request_cost=get_cost_item,
            retrieval_cost=retrieval_cost_item,
            data_transfer_cost=transfer_cost_item,
            lifecycle_cost=None,
            stage_breakdowns=[stage_breakdown],
            pricing_metadata=PricingMetadata(
                source="LOCAL_FALLBACK",
                updated_at=datetime.now(),
                region=pricing.region,
                is_fallback=True,
            ),
        )

        # 计算费用汇总
        breakdown = self._calculate_storage_costs(
            metrics, pricing, storage_class, discount
        )

        summary = CostSummary(
            monthly_total=breakdown.total,
            per_device_monthly=breakdown.total / functional.device_count,
            breakdown=breakdown,
            device_count=functional.device_count,
            metrics=metrics,
        )

        return summary, detailed_breakdown

    def _calculate_transfer_cost_item(
        self,
        monthly_transfer_gb: float,
        pricing: S3Pricing,
        discount_multiplier: float,
    ) -> CostItem:
        """计算数据传输费用（含阶梯明细）"""
        tiers = self._calculate_transfer_tiers(monthly_transfer_gb, pricing, discount_multiplier)
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

    def _calculate_transfer_tiers(
        self,
        total_gb: float,
        pricing: S3Pricing,
        discount_multiplier: float,
    ) -> list[TierDetail]:
        """计算数据传输阶梯明细"""
        tiers = []
        remaining_gb = total_gb
        transfer = pricing.data_transfer

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
            tier_cost = tier_usage * price * discount_multiplier

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
