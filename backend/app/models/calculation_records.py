"""详细成本核算记录数据模型

定义核算记录相关的数据结构，包括：
- 存储策略枚举
- 输入参数快照（三维度）
- 中间计算指标详情
- 阶段费用明细
- 费用汇总详情
- 定价数据快照
- 核算记录主体
"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, computed_field

from app.models.dimensions import (
    FunctionalDimensions,
    TechnicalDimensions,
    PricingDimensions,
)


# ============================================================
# 枚举和常量
# ============================================================


class StorageStrategy(str, Enum):
    """存储策略类型"""
    SINGLE_STANDARD = "single_standard"                    # 单一 S3 Standard
    SINGLE_GLACIER_IR = "single_glacier_ir"               # 单一 Glacier IR
    LIFECYCLE_STANDARD_TO_GLACIER = "lifecycle_std_glacier"  # 生命周期: Standard → Glacier
    LIFECYCLE_MULTI_STAGE = "lifecycle_multi_stage"       # 生命周期: 多阶段


# ============================================================
# 输入参数快照
# ============================================================


class FunctionalDimensionSnapshot(BaseModel):
    """功能维度快照"""
    device_count: int = Field(..., ge=1, description="设备数量")
    recording_mode: str = Field(..., description="录像模式")
    video_quality: str = Field(..., description="视频质量")
    retention_days: int = Field(..., ge=1, le=365, description="保留天数")
    events_per_day: Optional[int] = Field(default=None, description="每日事件数")
    event_duration_seconds: Optional[int] = Field(default=None, description="事件时长(秒)")
    scheduled_hours: Optional[float] = Field(default=None, description="定时录像时长(小时)")
    access_pattern: float = Field(..., ge=0, le=1, description="回看比例")


class TechnicalDimensionSnapshot(BaseModel):
    """技术维度快照"""
    storage_class: str = Field(..., description="存储类型")
    segment_strategy: str = Field(..., description="分片策略")
    segment_seconds: Optional[int] = Field(default=None, description="分片时长(秒)")
    segment_size_kb: Optional[int] = Field(default=None, description="分片大小(KB)")
    lifecycle_enabled: bool = Field(default=False, description="是否启用生命周期")
    lifecycle_stages: Optional[List[Dict]] = Field(default=None, description="生命周期阶段配置")


class PricingDimensionSnapshot(BaseModel):
    """价格维度快照"""
    region: str = Field(..., description="AWS 区域代码")
    region_name: str = Field(default="", description="区域名称")
    discount_percent: float = Field(..., ge=0, le=50, description="折扣百分比 (0-50)")


class InputParameterSnapshot(BaseModel):
    """输入参数快照 - 三维度组织"""
    functional: FunctionalDimensionSnapshot = Field(..., description="功能维度")
    technical: TechnicalDimensionSnapshot = Field(..., description="技术维度")
    pricing: PricingDimensionSnapshot = Field(..., description="价格维度")


# ============================================================
# 中间计算指标详情
# ============================================================


class AccessPatternStageSnapshot(BaseModel):
    """访问模式阶段快照"""
    start_day: int = Field(..., ge=1, description="开始天数")
    end_day: int = Field(..., ge=1, description="结束天数")
    access_rate: float = Field(..., ge=0, le=1, description="访问比例")
    duration_days: int = Field(..., ge=1, description="持续天数")


class IntermediateMetricsDetail(BaseModel):
    """详细中间计算指标"""

    # 数据量指标
    daily_recording_seconds: float = Field(default=0, description="每日录像秒数")
    daily_data_kb: float = Field(default=0, description="每日数据量 (KB)")
    daily_data_gb: float = Field(..., description="每日数据量 (GB)")
    monthly_data_gb: float = Field(default=0, description="月度数据量 (GB)")
    avg_storage_gb: float = Field(..., description="平均存储量 (GB)")
    avg_storage_tb: float = Field(default=0, description="平均存储量 (TB)")

    # 分片指标
    segments_per_event: Optional[float] = Field(default=None, description="每事件分片数")
    segments_per_day: float = Field(default=0, description="每日分片数")

    # 请求数指标
    monthly_puts: float = Field(..., description="月度 PUT 请求数")
    monthly_gets: float = Field(..., description="月度 GET 请求数")

    # 检索和传输指标
    monthly_retrieval_gb: float = Field(default=0, description="月度检索量 (GB)")
    monthly_transfer_gb: float = Field(default=0, description="月度传输量 (GB)")

    # 访问模式相关指标（时间衰减模式增强）
    access_pattern_mode: str = Field(default="simple", description="访问模式: simple 或 time_decay")
    weighted_access_pattern: Optional[float] = Field(default=None, description="加权平均访问比例 (time_decay 模式)")
    access_pattern_stages: Optional[List[AccessPatternStageSnapshot]] = Field(
        default=None, description="访问模式各阶段配置快照 (time_decay 模式)"
    )


# ============================================================
# 费用项明细
# ============================================================


class TierDetailSnapshot(BaseModel):
    """阶梯定价明细"""
    tier_name: str = Field(..., description="阶梯名称")
    range_start_gb: float = Field(..., ge=0, description="起始量 (GB)")
    range_end_gb: Optional[float] = Field(default=None, description="结束量 (GB)")
    unit_price: float = Field(..., ge=0, description="阶梯单价")
    quantity_gb: float = Field(..., ge=0, description="阶梯用量")
    amount: float = Field(..., ge=0, description="阶梯费用")


class CostItemDetail(BaseModel):
    """费用项明细 - 单价 × 用量 = 金额"""
    name: str = Field(..., description="费用项名称")
    unit_price: float = Field(..., ge=0, description="单价")
    unit_price_unit: str = Field(..., description="单价单位 (如 USD/GB)")
    quantity: float = Field(..., ge=0, description="用量")
    quantity_unit: str = Field(..., description="用量单位 (如 GB)")
    amount: float = Field(..., ge=0, description="费用金额 (USD)")
    tiers: Optional[List[TierDetailSnapshot]] = Field(default=None, description="阶梯明细")


class StageCostDetail(BaseModel):
    """单阶段费用明细"""
    stage_index: int = Field(..., ge=0, description="阶段索引")
    start_day: int = Field(..., ge=1, description="开始天数")
    end_day: int = Field(..., ge=1, description="结束天数")
    duration_days: int = Field(..., ge=1, description="持续天数")
    storage_class: str = Field(..., description="存储类型")

    # 访问比例（时间衰减模式增强）
    access_rate: float = Field(default=0.0, ge=0, le=1, description="该阶段的访问比例")

    # 费用明细项
    storage_cost: CostItemDetail = Field(..., description="存储费用")
    put_request_cost: CostItemDetail = Field(..., description="PUT 请求费用")
    get_request_cost: CostItemDetail = Field(..., description="GET 请求费用")
    retrieval_cost: Optional[CostItemDetail] = Field(default=None, description="检索费用")
    transition_cost: Optional[CostItemDetail] = Field(default=None, description="转换费用")

    # 汇总
    stage_total: float = Field(..., description="阶段总费用")


# ============================================================
# 费用汇总
# ============================================================


class CostBreakdownPercent(BaseModel):
    """费用占比"""
    storage: float = Field(..., ge=0, le=1, description="存储占比")
    put_requests: float = Field(..., ge=0, le=1, description="PUT 请求占比")
    get_requests: float = Field(..., ge=0, le=1, description="GET 请求占比")
    retrieval: float = Field(default=0, ge=0, le=1, description="检索占比")
    lifecycle: float = Field(default=0, ge=0, le=1, description="生命周期转换占比")
    data_transfer: float = Field(default=0, ge=0, le=1, description="数据传输占比")


class CostSummaryDetail(BaseModel):
    """费用汇总"""

    # 各项费用
    storage_cost: float = Field(..., ge=0, description="存储费用")
    put_request_cost: float = Field(..., ge=0, description="PUT 请求费用")
    get_request_cost: float = Field(..., ge=0, description="GET 请求费用")
    retrieval_cost: float = Field(default=0, ge=0, description="检索费用")
    lifecycle_cost: float = Field(default=0, ge=0, description="生命周期转换费用")
    data_transfer_cost: float = Field(default=0, ge=0, description="数据传输费用")

    # 汇总
    subtotal: float = Field(..., ge=0, description="小计")
    discount_amount: float = Field(default=0, ge=0, description="折扣金额")
    total_cost: float = Field(..., ge=0, description="总成本")

    # 单位成本
    cost_per_device: float = Field(..., ge=0, description="单设备成本")
    cost_per_gb: float = Field(default=0, ge=0, description="单 GB 成本")

    # 费用占比
    breakdown_percent: CostBreakdownPercent = Field(..., description="费用占比")


# ============================================================
# 定价快照
# ============================================================


class StorageClassPricing(BaseModel):
    """单个存储类型定价"""
    storage_per_gb: float = Field(..., description="存储单价 (USD/GB/月)")
    put_per_1000: float = Field(..., description="PUT 请求单价 (USD/千次)")
    get_per_1000: float = Field(..., description="GET 请求单价 (USD/千次)")
    retrieval_per_gb: Optional[float] = Field(default=None, description="检索单价 (USD/GB)")
    transition_per_1000: Optional[float] = Field(default=None, description="转换单价 (USD/千次)")


class DataTransferTier(BaseModel):
    """数据传输阶梯"""
    tier_name: str = Field(..., description="阶梯名称")
    start_gb: float = Field(..., ge=0, description="起始量")
    end_gb: Optional[float] = Field(default=None, description="结束量")
    price_per_gb: float = Field(..., ge=0, description="单价 (USD/GB)")


class PricingSnapshot(BaseModel):
    """定价数据快照"""
    region: str = Field(..., description="AWS 区域代码")
    region_name: str = Field(..., description="区域名称")
    currency: str = Field(default="USD", description="货币")
    snapshot_date: str = Field(..., description="快照日期 (ISO 8601)")

    # 存储类型定价
    storage_pricing: Dict[str, StorageClassPricing] = Field(..., description="各存储类型定价")

    # 数据传输阶梯定价
    data_transfer_tiers: List[DataTransferTier] = Field(..., description="数据传输阶梯")


# ============================================================
# 核算记录主体
# ============================================================


def generate_record_id() -> str:
    """生成记录 ID，格式: CALC#{timestamp}#{uuid8}"""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    uuid8 = uuid4().hex[:8]
    return f"CALC#{timestamp}#{uuid8}"


class CalculationRecord(BaseModel):
    """核算记录主体"""
    # 基础信息
    record_id: str = Field(default_factory=generate_record_id, description="记录ID")
    user_id: str = Field(..., description="用户ID")
    name: str = Field(..., min_length=1, max_length=100, description="记录名称")
    description: str = Field(default="", max_length=500, description="描述")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    storage_strategy: StorageStrategy = Field(..., description="存储策略类型")

    # 核心数据
    input_params: InputParameterSnapshot = Field(..., description="输入参数快照")
    intermediate_metrics: IntermediateMetricsDetail = Field(..., description="中间计算指标")
    stage_details: List[StageCostDetail] = Field(default_factory=list, description="分阶段费用明细")
    cost_summary: CostSummaryDetail = Field(..., description="费用汇总")
    pricing_snapshot: PricingSnapshot = Field(..., description="定价快照")


# ============================================================
# API 请求/响应模型
# ============================================================


class CreateCalculationRecordRequest(BaseModel):
    """创建核算记录请求

    包含记录元数据（名称、描述）和完整的计算输入参数。
    前端将所有字段扁平化发送，后端统一解析。
    """
    # 记录元数据
    name: str = Field(..., min_length=1, max_length=100, description="记录名称")
    description: str = Field(default="", max_length=500, description="描述")

    # 计算输入参数（三维度）
    functional: FunctionalDimensions = Field(..., description="功能维度")
    technical: TechnicalDimensions = Field(default_factory=TechnicalDimensions, description="技术维度")
    pricing: PricingDimensions = Field(default_factory=PricingDimensions, description="价格维度")


class CalculationRecordSummary(BaseModel):
    """核算记录摘要（列表展示用）"""
    record_id: str = Field(..., description="记录ID")
    name: str = Field(..., description="记录名称")
    storage_strategy: StorageStrategy = Field(..., description="存储策略类型")
    total_cost: float = Field(..., description="总成本")
    created_at: datetime = Field(..., description="创建时间")


class CalculationRecordListResponse(BaseModel):
    """核算记录列表响应"""
    items: List[CalculationRecordSummary] = Field(..., description="记录列表")
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")

    @computed_field
    @property
    def total_pages(self) -> int:
        """总页数"""
        return (self.total + self.page_size - 1) // self.page_size if self.page_size > 0 else 0


class DetailedCalculationResult(BaseModel):
    """详细计算结果（实时预览响应）"""
    summary: CostSummaryDetail = Field(..., description="费用汇总")
    intermediate_metrics: IntermediateMetricsDetail = Field(..., description="中间计算指标")
    stage_details: List[StageCostDetail] = Field(default_factory=list, description="分阶段费用明细")
    storage_strategy: StorageStrategy = Field(..., description="存储策略类型")
    pricing_snapshot: PricingSnapshot = Field(..., description="定价快照")
    data_transfer_tiers: List[TierDetailSnapshot] = Field(
        default_factory=list,
        description="数据传输阶梯明细"
    )
