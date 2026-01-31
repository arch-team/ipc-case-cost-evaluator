"""核算记录生成器

提供核算记录的生成和转换功能：
- 从计算结果生成完整的核算记录
- 获取默认输入参数
- 判断存储策略类型
"""
from datetime import datetime
from typing import Optional, Tuple

from app.models.dimensions import (
    CostCalculationInput,
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
)
from app.models.enums import RecordingMode, VideoQuality, SegmentStrategy, StorageClass
from app.models.results import CostSummary, DetailedCostBreakdown
from app.models.calculation_records import (
    CalculationRecord,
    StorageStrategy,
    InputParameterSnapshot,
    FunctionalDimensionSnapshot,
    TechnicalDimensionSnapshot,
    PricingDimensionSnapshot,
    IntermediateMetricsDetail,
    AccessPatternStageSnapshot,
    StageCostDetail,
    CostItemDetail,
    TierDetailSnapshot,
    CostSummaryDetail,
    CostBreakdownPercent,
    PricingSnapshot,
    StorageClassPricing,
    DataTransferTier,
    DetailedCalculationResult,
)
from app.services.calculator.s3_standard import S3StandardCalculator
from app.services.calculator.lifecycle import LifecycleCalculator
from app.services.calculator.base import BaseCalculator
from app.services.pricing_service import get_pricing_service
from app.models.regions import get_region_name


# ============================================================
# 默认值配置
# ============================================================


def get_default_input() -> CostCalculationInput:
    """获取典型场景的默认输入参数

    Returns:
        CostCalculationInput: 默认输入参数
    """
    return CostCalculationInput(
        functional=FunctionalDimensions(
            device_count=10,
            recording_mode=RecordingMode.EVENT_TRIGGERED,
            video_quality=VideoQuality.P1080,
            retention_days=30,
            events_per_day=50,
            event_duration_sec=30,
            access_pattern=0.1,
            segment_strategy=SegmentStrategy.FIXED_DURATION,
            segment_value=10,
        ),
        technical=TechnicalDimensions(
            storage_class=StorageClass.STANDARD,
            lifecycle_policy=None,
        ),
        pricing=PricingDimensions(
            region="us-east-1",
            discount_percent=0.0,
        ),
    )


# ============================================================
# 存储策略判断
# ============================================================


def determine_storage_strategy(input_data: CostCalculationInput) -> StorageStrategy:
    """根据输入参数判断存储策略类型

    Args:
        input_data: 输入参数

    Returns:
        StorageStrategy: 存储策略类型
    """
    lifecycle = input_data.technical.lifecycle_policy
    storage_class = input_data.technical.storage_class

    if lifecycle and lifecycle.enabled:
        if lifecycle.is_multi_stage:
            return StorageStrategy.LIFECYCLE_MULTI_STAGE
        else:
            return StorageStrategy.LIFECYCLE_STANDARD_TO_GLACIER
    elif storage_class == StorageClass.GLACIER_IR:
        return StorageStrategy.SINGLE_GLACIER_IR
    else:
        return StorageStrategy.SINGLE_STANDARD


# ============================================================
# 详细计算
# ============================================================


def calculate_detailed(
    input_data: CostCalculationInput,
) -> Tuple[CostSummary, DetailedCostBreakdown, StorageStrategy]:
    """执行详细成本计算

    根据输入参数选择合适的计算器，返回详细计算结果。

    Args:
        input_data: 输入参数

    Returns:
        (CostSummary, DetailedCostBreakdown, StorageStrategy) 元组
    """
    lifecycle = input_data.technical.lifecycle_policy
    strategy = determine_storage_strategy(input_data)

    if lifecycle and lifecycle.enabled:
        calculator = LifecycleCalculator()
        summary, detailed = calculator.calculate_with_details(input_data)
    else:
        calculator = S3StandardCalculator()
        summary, detailed = calculator.calculate_with_details(input_data)

    return summary, detailed, strategy


# ============================================================
# 模型转换
# ============================================================


def _convert_cost_item(item) -> CostItemDetail:
    """将 CostItem 转换为 CostItemDetail"""
    tiers = [
        TierDetailSnapshot(
            tier_name=t.tier_name,
            range_start_gb=t.range_start_gb,
            range_end_gb=t.range_end_gb,
            unit_price=t.unit_price,
            quantity_gb=t.quantity_gb,
            amount=t.amount,
        )
        for t in getattr(item, "tiers", []) or []
    ] if hasattr(item, "tiers") else None

    return CostItemDetail(
        name=item.name,
        unit_price=item.unit_price,
        unit_price_unit=item.unit_price_unit,
        quantity=item.quantity,
        quantity_unit=item.quantity_unit,
        amount=item.amount,
        tiers=tiers,
    )


def _convert_stage_breakdown(
    stage,
    index: int,
    functional: Optional[FunctionalDimensions] = None,
) -> StageCostDetail:
    """将 StageCostBreakdown 转换为 StageCostDetail

    Args:
        stage: 阶段费用明细
        index: 阶段索引
        functional: 功能维度（用于获取访问比例）

    Returns:
        StageCostDetail: 转换后的阶段费用明细
    """
    # 获取该阶段的访问比例
    access_rate = 0.0
    if functional:
        access_rate = functional.get_access_rate_for_period(stage.start_day, stage.end_day)

    return StageCostDetail(
        stage_index=index,
        start_day=stage.start_day,
        end_day=stage.end_day,
        duration_days=stage.duration_days,
        storage_class=stage.storage_class.value if hasattr(stage.storage_class, "value") else str(stage.storage_class),
        access_rate=access_rate,
        storage_cost=_convert_cost_item(stage.storage_cost),
        put_request_cost=_convert_cost_item(stage.request_cost),
        get_request_cost=CostItemDetail(
            name="GET 请求",
            unit_price=0,
            unit_price_unit="USD/千次",
            quantity=0,
            quantity_unit="千次",
            amount=0,
        ),
        retrieval_cost=_convert_cost_item(stage.retrieval_cost) if stage.retrieval_cost else None,
        transition_cost=_convert_cost_item(stage.transition_cost) if stage.transition_cost else None,
        stage_total=stage.stage_total,
    )


def _build_input_snapshot(input_data: CostCalculationInput) -> InputParameterSnapshot:
    """构建输入参数快照"""
    functional = input_data.functional
    technical = input_data.technical
    pricing_dim = input_data.pricing

    # 获取区域名称
    region_name = get_region_name(pricing_dim.region)

    lifecycle_stages = None
    if technical.lifecycle_policy and technical.lifecycle_policy.stages:
        lifecycle_stages = [
            {
                "start_day": s.start_day,
                "end_day": s.end_day,
                "storage_class": s.storage_class.value,
            }
            for s in technical.lifecycle_policy.stages
        ]

    return InputParameterSnapshot(
        functional=FunctionalDimensionSnapshot(
            device_count=functional.device_count,
            recording_mode=functional.recording_mode.value,
            video_quality=functional.video_quality.value,
            retention_days=functional.retention_days,
            events_per_day=functional.events_per_day,
            event_duration_seconds=functional.event_duration_sec,
            scheduled_hours=functional.scheduled_hours,
            access_pattern=functional.access_pattern,
        ),
        technical=TechnicalDimensionSnapshot(
            storage_class=technical.storage_class.value,
            segment_strategy=functional.segment_strategy.value,
            segment_seconds=functional.segment_value if functional.segment_strategy == SegmentStrategy.FIXED_DURATION else None,
            segment_size_kb=functional.segment_value if functional.segment_strategy == SegmentStrategy.FIXED_SIZE else None,
            lifecycle_enabled=technical.lifecycle_policy.enabled if technical.lifecycle_policy else False,
            lifecycle_stages=lifecycle_stages,
        ),
        pricing=PricingDimensionSnapshot(
            region=pricing_dim.region,
            region_name=region_name,
            discount_percent=pricing_dim.discount_percent * 100,  # 转换为百分比显示
        ),
    )


def _build_intermediate_metrics(
    summary: CostSummary,
    functional: FunctionalDimensions,
) -> IntermediateMetricsDetail:
    """构建中间计算指标"""
    metrics = summary.metrics
    daily_data_gb = metrics.daily_data_gb if metrics else 0

    # 计算额外的中间指标
    daily_recording_seconds = BaseCalculator.calculate_daily_recording_seconds(functional)
    daily_data_kb = daily_data_gb * 1024 * 1024
    monthly_data_gb = daily_data_gb * 30
    avg_storage_gb = metrics.avg_storage_gb if metrics else 0
    avg_storage_tb = avg_storage_gb / 1024
    segments_per_day = BaseCalculator.calculate_segments_per_day(functional, daily_data_gb)

    # 处理访问模式相关指标
    access_pattern_mode = "simple"
    weighted_access_pattern = None
    access_pattern_stages = None

    config = functional.access_pattern_config
    if config and config.mode == "time_decay" and config.stages:
        access_pattern_mode = "time_decay"
        access_pattern_stages = [
            AccessPatternStageSnapshot(
                start_day=stage.start_day,
                end_day=stage.end_day,
                access_rate=stage.access_rate,
                duration_days=stage.duration_days,
            )
            for stage in config.stages
        ]

        # 计算加权平均访问比例
        total_days = sum(s.duration_days for s in config.stages)
        weighted_sum = sum(s.access_rate * s.duration_days for s in config.stages)
        weighted_access_pattern = _calculate_percentage(weighted_sum, total_days)

    return IntermediateMetricsDetail(
        daily_recording_seconds=daily_recording_seconds,
        daily_data_kb=daily_data_kb,
        daily_data_gb=daily_data_gb,
        monthly_data_gb=monthly_data_gb,
        avg_storage_gb=avg_storage_gb,
        avg_storage_tb=avg_storage_tb,
        segments_per_day=segments_per_day,
        monthly_puts=metrics.monthly_puts if metrics else 0,
        monthly_gets=metrics.monthly_gets if metrics else 0,
        monthly_retrieval_gb=metrics.monthly_retrieval_gb if metrics else 0,
        monthly_transfer_gb=metrics.monthly_transfer_gb if metrics else 0,
        access_pattern_mode=access_pattern_mode,
        weighted_access_pattern=weighted_access_pattern,
        access_pattern_stages=access_pattern_stages,
    )


def _calculate_percentage(value: float, total: float) -> float:
    """安全计算百分比"""
    return value / total if total > 0 else 0


def _build_cost_summary(
    summary: CostSummary,
    avg_storage_gb: float,
) -> CostSummaryDetail:
    """构建费用汇总"""
    breakdown = summary.breakdown
    total = breakdown.total

    return CostSummaryDetail(
        storage_cost=breakdown.storage_cost,
        put_request_cost=breakdown.put_request_cost,
        get_request_cost=breakdown.get_request_cost,
        retrieval_cost=breakdown.retrieval_cost,
        lifecycle_cost=breakdown.lifecycle_cost,
        data_transfer_cost=breakdown.data_transfer_cost,
        subtotal=total,
        discount_amount=0,  # 折扣已经应用到各项费用中
        total_cost=total,
        cost_per_device=summary.per_device_monthly,
        cost_per_gb=_calculate_percentage(total, avg_storage_gb),
        breakdown_percent=CostBreakdownPercent(
            storage=_calculate_percentage(breakdown.storage_cost, total),
            put_requests=_calculate_percentage(breakdown.put_request_cost, total),
            get_requests=_calculate_percentage(breakdown.get_request_cost, total),
            retrieval=_calculate_percentage(breakdown.retrieval_cost, total),
            lifecycle=_calculate_percentage(breakdown.lifecycle_cost, total),
            data_transfer=_calculate_percentage(breakdown.data_transfer_cost, total),
        ),
    )


def _build_pricing_snapshot(region: str) -> PricingSnapshot:
    """构建定价快照"""
    pricing_service = get_pricing_service()
    pricing, _ = pricing_service.get_pricing(region)
    region_name = get_region_name(region)

    # 构建各存储类型定价
    storage_pricing = {}
    for sc in [StorageClass.STANDARD, StorageClass.GLACIER_IR, StorageClass.DEEP_ARCHIVE]:
        storage_pricing[sc.value] = StorageClassPricing(
            storage_per_gb=pricing.get_storage_price(sc),
            put_per_1000=pricing.get_put_price(sc),
            get_per_1000=pricing.get_get_price(sc),
            retrieval_per_gb=pricing.get_retrieval_price(sc) if pricing.get_retrieval_price(sc) > 0 else None,
            transition_per_1000=pricing.get_lifecycle_price(sc) if pricing.get_lifecycle_price(sc) > 0 else None,
        )

    # 构建数据传输阶梯
    transfer = pricing.data_transfer
    data_transfer_tiers = [
        DataTransferTier(
            tier_name="前 10TB",
            start_gb=0,
            end_gb=10 * 1024,
            price_per_gb=transfer.out_first_10tb_per_gb,
        ),
        DataTransferTier(
            tier_name="10-50TB",
            start_gb=10 * 1024,
            end_gb=50 * 1024,
            price_per_gb=transfer.out_next_40tb_per_gb,
        ),
        DataTransferTier(
            tier_name="50-150TB",
            start_gb=50 * 1024,
            end_gb=150 * 1024,
            price_per_gb=transfer.out_next_100tb_per_gb,
        ),
        DataTransferTier(
            tier_name="150TB 以上",
            start_gb=150 * 1024,
            end_gb=None,
            price_per_gb=transfer.out_over_150tb_per_gb,
        ),
    ]

    return PricingSnapshot(
        region=region,
        region_name=region_name,
        currency="USD",
        snapshot_date=datetime.utcnow().isoformat(),
        storage_pricing=storage_pricing,
        data_transfer_tiers=data_transfer_tiers,
    )


# ============================================================
# 核心功能
# ============================================================


def _build_stage_details(
    detailed: DetailedCostBreakdown,
    functional: FunctionalDimensions
) -> list[StageCostDetail]:
    """构建分阶段明细列表

    Args:
        detailed: 详细成本分解
        functional: 功能维度

    Returns:
        分阶段明细列表
    """
    stage_details = []
    if detailed.stage_breakdowns:
        for i, stage in enumerate(detailed.stage_breakdowns):
            stage_details.append(_convert_stage_breakdown(stage, i, functional))
    return stage_details


def _build_transfer_tiers(
    detailed: DetailedCostBreakdown
) -> list[TierDetailSnapshot]:
    """构建数据传输阶梯明细

    Args:
        detailed: 详细成本分解

    Returns:
        数据传输阶梯列表
    """
    tiers = []
    if detailed.data_transfer_cost and detailed.data_transfer_cost.tiers:
        for tier in detailed.data_transfer_cost.tiers:
            tiers.append(TierDetailSnapshot(
                tier_name=tier.tier_name,
                range_start_gb=tier.range_start_gb,
                range_end_gb=tier.range_end_gb,
                unit_price=tier.unit_price,
                quantity_gb=tier.quantity_gb,
                amount=tier.amount,
            ))
    return tiers


def _generate_common_result(
    input_data: CostCalculationInput,
) -> tuple:
    """生成通用计算结果组件

    Args:
        input_data: 输入参数

    Returns:
        包含所有通用组件的元组
    """
    # 执行计算
    summary, detailed, strategy = calculate_detailed(input_data)

    # 构建各部分
    intermediate_metrics = _build_intermediate_metrics(summary, input_data.functional)
    cost_summary = _build_cost_summary(summary, intermediate_metrics.avg_storage_gb)
    pricing_snapshot = _build_pricing_snapshot(input_data.pricing.region)
    stage_details = _build_stage_details(detailed, input_data.functional)

    return summary, detailed, strategy, intermediate_metrics, cost_summary, pricing_snapshot, stage_details


def generate_detailed_result(
    input_data: CostCalculationInput,
) -> DetailedCalculationResult:
    """生成详细计算结果（用于实时预览）

    Args:
        input_data: 输入参数

    Returns:
        DetailedCalculationResult: 详细计算结果
    """
    (summary, detailed, strategy, intermediate_metrics,
     cost_summary, pricing_snapshot, stage_details) = _generate_common_result(input_data)

    # 提取数据传输阶梯
    data_transfer_tiers = _build_transfer_tiers(detailed)

    return DetailedCalculationResult(
        summary=cost_summary,
        intermediate_metrics=intermediate_metrics,
        stage_details=stage_details,
        storage_strategy=strategy,
        pricing_snapshot=pricing_snapshot,
        data_transfer_tiers=data_transfer_tiers,
    )


def generate_calculation_record(
    input_data: CostCalculationInput,
    user_id: str,
    name: str,
    description: str = "",
) -> CalculationRecord:
    """生成完整的核算记录

    Args:
        input_data: 输入参数
        user_id: 用户 ID
        name: 记录名称
        description: 描述

    Returns:
        CalculationRecord: 核算记录
    """
    (summary, detailed, strategy, intermediate_metrics,
     cost_summary, pricing_snapshot, stage_details) = _generate_common_result(input_data)

    # 构建输入快照
    input_snapshot = _build_input_snapshot(input_data)

    return CalculationRecord(
        user_id=user_id,
        name=name,
        description=description,
        storage_strategy=strategy,
        input_params=input_snapshot,
        intermediate_metrics=intermediate_metrics,
        stage_details=stage_details,
        cost_summary=cost_summary,
        pricing_snapshot=pricing_snapshot,
    )
