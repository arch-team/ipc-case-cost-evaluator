# Data Model: 详细成本核算记录

**Feature**: 004-detailed-cost-records
**Date**: 2026-01-31

## 实体关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                    CalculationRecord                            │
│  (核算记录主体)                                                  │
├─────────────────────────────────────────────────────────────────┤
│  record_id: str (PK)     - 格式: CALC#{timestamp}#{uuid8}       │
│  user_id: str            - 用户 ID                              │
│  name: str               - 记录名称 (max 100)                   │
│  description: str        - 描述 (max 500, optional)             │
│  created_at: datetime    - 创建时间                             │
│  storage_strategy: enum  - 存储策略类型                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ InputParameterSnapshot │ IntermediateMetrics  │               │
│  │ (输入参数快照)        │  │ (中间计算指标)      │               │
│  └─────────────────────┘  └─────────────────────┘               │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ List[StageCostDetail]│ │ CostSummaryDetail   │               │
│  │ (分阶段费用明细)      │  │ (费用汇总)          │               │
│  └─────────────────────┘  └─────────────────────┘               │
│  ┌─────────────────────┐                                        │
│  │ PricingSnapshot     │                                        │
│  │ (定价快照)          │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

## 实体定义

### 1. CalculationRecord (核算记录)

主实体，存储完整的成本核算信息。

```python
class CalculationRecord(BaseModel):
    """核算记录主体"""
    record_id: str = Field(..., description="记录ID，格式: CALC#{timestamp}#{uuid8}")
    user_id: str = Field(..., description="用户ID")
    name: str = Field(..., min_length=1, max_length=100, description="记录名称")
    description: str = Field(default="", max_length=500, description="描述")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    storage_strategy: StorageStrategy = Field(..., description="存储策略类型")

    # 嵌套实体
    input_params: InputParameterSnapshot = Field(..., description="输入参数快照")
    intermediate_metrics: IntermediateMetricsDetail = Field(..., description="中间计算指标")
    stage_details: List[StageCostDetail] = Field(default_factory=list, description="分阶段费用明细")
    cost_summary: CostSummaryDetail = Field(..., description="费用汇总")
    pricing_snapshot: PricingSnapshot = Field(..., description="定价快照")
```

### 2. StorageStrategy (存储策略枚举)

```python
class StorageStrategy(str, Enum):
    """存储策略类型"""
    SINGLE_STANDARD = "single_standard"                    # 单一 S3 Standard
    SINGLE_GLACIER_IR = "single_glacier_ir"               # 单一 Glacier IR
    LIFECYCLE_STANDARD_TO_GLACIER = "lifecycle_std_glacier"  # 生命周期: Standard → Glacier
    LIFECYCLE_MULTI_STAGE = "lifecycle_multi_stage"       # 生命周期: 多阶段
```

### 3. InputParameterSnapshot (输入参数快照)

按三维度组织的输入参数快照。

```python
class InputParameterSnapshot(BaseModel):
    """输入参数快照 - 三维度组织"""

    # 功能维度
    functional: FunctionalDimensionSnapshot = Field(..., description="功能维度")

    # 技术维度
    technical: TechnicalDimensionSnapshot = Field(..., description="技术维度")

    # 价格维度
    pricing: PricingDimensionSnapshot = Field(..., description="价格维度")


class FunctionalDimensionSnapshot(BaseModel):
    """功能维度快照"""
    device_count: int = Field(..., ge=1, description="设备数量")
    recording_mode: str = Field(..., description="录像模式")
    video_quality: str = Field(..., description="视频质量")
    retention_days: int = Field(..., ge=1, le=365, description="保留天数")
    events_per_day: Optional[int] = Field(default=None, description="每日事件数")
    event_duration_seconds: Optional[int] = Field(default=None, description="事件时长(秒)")
    scheduled_hours: Optional[int] = Field(default=None, description="定时录像时长(小时)")
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
    region: str = Field(..., description="AWS 区域")
    region_name: str = Field(..., description="区域名称")
    discount_percent: float = Field(..., ge=0, le=50, description="折扣百分比")
```

### 4. IntermediateMetricsDetail (中间计算指标)

扩展现有 `IntermediateMetrics`，添加更详细的中间数据。

```python
class IntermediateMetricsDetail(BaseModel):
    """详细中间计算指标"""

    # 数据量指标
    daily_recording_seconds: float = Field(..., description="每日录像秒数")
    daily_data_kb: float = Field(..., description="每日数据量 (KB)")
    daily_data_gb: float = Field(..., description="每日数据量 (GB)")
    monthly_data_gb: float = Field(..., description="月度数据量 (GB)")
    avg_storage_gb: float = Field(..., description="平均存储量 (GB)")
    avg_storage_tb: float = Field(..., description="平均存储量 (TB)")

    # 分片指标
    segments_per_event: Optional[float] = Field(default=None, description="每事件分片数")
    segments_per_day: float = Field(..., description="每日分片数")

    # 请求数指标
    monthly_puts: float = Field(..., description="月度 PUT 请求数")
    monthly_gets: float = Field(..., description="月度 GET 请求数")

    # 检索和传输指标
    monthly_retrieval_gb: float = Field(default=0, description="月度检索量 (GB)")
    monthly_transfer_gb: float = Field(default=0, description="月度传输量 (GB)")
```

### 5. StageCostDetail (阶段费用明细)

复用现有 `StageCostBreakdown`，包含每个阶段的详细费用。

```python
class StageCostDetail(BaseModel):
    """单阶段费用明细"""
    stage_index: int = Field(..., ge=0, description="阶段索引")
    start_day: int = Field(..., ge=1, description="开始天数")
    end_day: int = Field(..., ge=1, description="结束天数")
    duration_days: int = Field(..., ge=1, description="持续天数")
    storage_class: str = Field(..., description="存储类型")

    # 费用明细项
    storage_cost: CostItemDetail = Field(..., description="存储费用")
    put_request_cost: CostItemDetail = Field(..., description="PUT 请求费用")
    get_request_cost: CostItemDetail = Field(..., description="GET 请求费用")
    retrieval_cost: Optional[CostItemDetail] = Field(default=None, description="检索费用")
    transition_cost: Optional[CostItemDetail] = Field(default=None, description="转换费用")

    # 汇总
    stage_total: float = Field(..., description="阶段总费用")


class CostItemDetail(BaseModel):
    """费用项明细 - 单价 × 用量 = 金额"""
    name: str = Field(..., description="费用项名称")
    unit_price: float = Field(..., ge=0, description="单价")
    unit_price_unit: str = Field(..., description="单价单位 (如 USD/GB)")
    quantity: float = Field(..., ge=0, description="用量")
    quantity_unit: str = Field(..., description="用量单位 (如 GB)")
    amount: float = Field(..., ge=0, description="费用金额 (USD)")

    # 阶梯定价明细（可选）
    tiers: Optional[List[TierDetailSnapshot]] = Field(default=None, description="阶梯明细")


class TierDetailSnapshot(BaseModel):
    """阶梯定价明细"""
    tier_name: str = Field(..., description="阶梯名称")
    range_start_gb: float = Field(..., ge=0, description="起始量 (GB)")
    range_end_gb: Optional[float] = Field(default=None, description="结束量 (GB)")
    unit_price: float = Field(..., ge=0, description="阶梯单价")
    quantity_gb: float = Field(..., ge=0, description="阶梯用量")
    amount: float = Field(..., ge=0, description="阶梯费用")
```

### 6. CostSummaryDetail (费用汇总)

```python
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
    cost_per_gb: float = Field(..., ge=0, description="单 GB 成本")

    # 费用占比
    breakdown_percent: CostBreakdownPercent = Field(..., description="费用占比")


class CostBreakdownPercent(BaseModel):
    """费用占比"""
    storage: float = Field(..., ge=0, le=1, description="存储占比")
    put_requests: float = Field(..., ge=0, le=1, description="PUT 请求占比")
    get_requests: float = Field(..., ge=0, le=1, description="GET 请求占比")
    retrieval: float = Field(default=0, ge=0, le=1, description="检索占比")
    lifecycle: float = Field(default=0, ge=0, le=1, description="生命周期转换占比")
    data_transfer: float = Field(default=0, ge=0, le=1, description="数据传输占比")
```

### 7. PricingSnapshot (定价快照)

```python
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
```

## DynamoDB 表设计

### 表: `ipc_cost_calculation_records`

| 属性 | 类型 | 键类型 | 说明 |
|------|------|--------|------|
| `user_id` | String | PK | 用户 ID |
| `record_id` | String | SK | 格式: `CALC#{timestamp}#{uuid8}` |
| `name` | String | - | 记录名称 |
| `description` | String | - | 描述 |
| `created_at` | String | - | ISO 8601 时间戳 |
| `storage_strategy` | String | - | 存储策略枚举值 |
| `input_params` | Map | - | JSON 序列化的 InputParameterSnapshot |
| `intermediate_metrics` | Map | - | JSON 序列化的 IntermediateMetricsDetail |
| `stage_details` | List | - | JSON 序列化的 List[StageCostDetail] |
| `cost_summary` | Map | - | JSON 序列化的 CostSummaryDetail |
| `pricing_snapshot` | Map | - | JSON 序列化的 PricingSnapshot |

### 访问模式

| 操作 | 键条件 | 说明 |
|------|--------|------|
| 创建记录 | PutItem | user_id + 生成的 record_id |
| 获取单条 | GetItem | user_id + record_id |
| 列出用户记录 | Query | user_id (PK), 按 record_id 倒序 |
| 删除记录 | DeleteItem | user_id + record_id |

## 验证规则

| 字段 | 规则 | 错误消息 |
|------|------|---------|
| name | 1-100 字符，非空 | "记录名称不能为空且不超过100字符" |
| description | 0-500 字符 | "描述不超过500字符" |
| device_count | >= 1 | "设备数量至少为1" |
| retention_days | 1-365 | "保留天数必须在1-365之间" |
| discount_percent | 0-50 | "折扣百分比必须在0-50之间" |
| access_pattern | 0-1 | "回看比例必须在0-1之间" |

## 状态转换

核算记录为不可变实体，无状态转换：
- **创建**: 生成完整记录并存储
- **读取**: 返回完整记录数据
- **删除**: 硬删除，不可恢复
- **更新**: 不支持（设计约束）
