# IPC Cost Evaluator - 数据模型与 Schema

> **Freshness**: 2026-01-31T14:30:00Z
> **版本**: 1.2.0

## 概述

本文档描述 IPC Cost Evaluator 系统中的所有数据模型定义，包括 Pydantic 模型、枚举类型、AWS 定价 Schema 和数据库表结构。

---

## Pydantic 数据模型

### 三类维度模型

**文件**: `backend/app/models/dimensions.py`

#### FunctionalDimensions - 功能维度

```python
class FunctionalDimensions(BaseModel):
    device_count: int            # 设备数量 (1-100000)
    recording_mode: RecordingMode # 录像模式
    video_quality: VideoQuality   # 视频质量
    access_pattern: float         # 回看比例 (0.0-1.0)
    retention_days: int           # 保留天数 (1-3650)

    # 事件触发模式参数
    events_per_day: int = 0       # 每日事件数
    event_duration_sec: int = 0   # 事件时长(秒)

    # 分片策略
    segment_strategy: SegmentStrategy
    segment_value: int            # 分片时长(秒)或大小(KB)

    # 计算属性
    @computed_field
    def data_rate_kb(self) -> int:
        # 根据视频质量返回数据率 (KB/s)
```

| 字段 | 类型 | 范围 | 说明 |
|------|------|------|------|
| device_count | int | 1-100000 | IPC 设备数量 |
| recording_mode | enum | 3 种 | 录像模式 |
| video_quality | enum | 4 种 | 视频质量等级 |
| access_pattern | float | 0.0-1.0 | 回看访问比例 |
| retention_days | int | 1-3650 | 数据保留天数 |
| events_per_day | int | ≥0 | 事件触发模式用 |
| event_duration_sec | int | ≥0 | 事件平均时长 |
| segment_strategy | enum | 3 种 | 分片策略 |
| segment_value | int | >0 | 分片参数值 |

#### TechnicalDimensions - 技术维度

```python
class TechnicalDimensions(BaseModel):
    storage_class: StorageClass = StorageClass.STANDARD
    lifecycle_policy: Optional[LifecyclePolicy] = None
```

| 字段 | 类型 | 说明 |
|------|------|------|
| storage_class | enum | 存储类型 |
| lifecycle_policy | LifecyclePolicy | 生命周期策略（可选） |

#### PricingDimensions - 价格维度

```python
class PricingDimensions(BaseModel):
    region: str = "ap-northeast-1"
    discount_percent: float = 0.0      # 0.0-50.0
    pricing_model: PricingModel = PricingModel.ON_DEMAND
```

| 字段 | 类型 | 说明 |
|------|------|------|
| region | str | AWS 区域代码 |
| discount_percent | float | 折扣比例 (0-50%) |
| pricing_model | enum | 计费模式 |

#### CostCalculationInput - 完整输入

```python
class CostCalculationInput(BaseModel):
    functional: FunctionalDimensions
    technical: TechnicalDimensions
    pricing: PricingDimensions
```

---

### 生命周期策略模型

#### LifecycleStage - 生命周期阶段

```python
class LifecycleStage(BaseModel):
    start_day: int               # 开始天数 (0-3650)
    end_day: Optional[int]       # 结束天数 (None=永久)
    storage_class: StorageClass  # 该阶段存储类型
```

#### LifecyclePolicy - 生命周期策略

```python
class LifecyclePolicy(BaseModel):
    enabled: bool = False
    stages: List[LifecycleStage] = []
```

**示例**:
```json
{
  "enabled": true,
  "stages": [
    {"start_day": 0, "end_day": 30, "storage_class": "STANDARD"},
    {"start_day": 31, "end_day": 365, "storage_class": "GLACIER_IR"},
    {"start_day": 366, "end_day": null, "storage_class": "DEEP_ARCHIVE"}
  ]
}
```

---

## 枚举类型定义

**文件**: `backend/app/models/enums.py`

### RecordingMode - 录像模式

```python
class RecordingMode(str, Enum):
    CONTINUOUS = "continuous"        # 24x7 全天候
    EVENT_TRIGGERED = "event_triggered"  # 事件触发
    SCHEDULED = "scheduled"          # 定时段
```

### VideoQuality - 视频质量

```python
class VideoQuality(str, Enum):
    HD_720P = "720p"     # 500 KB/s
    FHD_1080P = "1080p"  # 1000 KB/s
    QHD_2K = "2k"        # 2000 KB/s
    UHD_4K = "4k"        # 4000 KB/s
```

| 质量等级 | 数据率 (KB/s) | 每小时数据 (GB) |
|---------|--------------|----------------|
| 720p | 500 | 1.76 |
| 1080p | 1000 | 3.52 |
| 2K | 2000 | 7.03 |
| 4K | 4000 | 14.06 |

### SegmentStrategy - 分片策略

```python
class SegmentStrategy(str, Enum):
    FIXED_DURATION = "fixed_duration"  # 固定时长
    FIXED_SIZE = "fixed_size"          # 固定大小
    STREAMING = "streaming"            # 实时流
```

### StorageClass - 存储类型

```python
class StorageClass(str, Enum):
    STANDARD = "STANDARD"
    GLACIER_IR = "GLACIER_IR"
    DEEP_ARCHIVE = "DEEP_ARCHIVE"
```

### PricingModel - 计费模式

```python
class PricingModel(str, Enum):
    ON_DEMAND = "on_demand"
    RESERVED = "reserved"
```

---

## 计算结果模型

**文件**: `backend/app/models/results.py`

### CostBreakdown - 费用明细

```python
class CostBreakdown(BaseModel):
    storage_cost: float         # 存储费用
    put_request_cost: float     # PUT 请求费用
    get_request_cost: float     # GET 请求费用
    retrieval_cost: float       # 检索费用 (Glacier)
    data_transfer_cost: float   # 数据传输费用
    lifecycle_cost: float       # 生命周期转换费用

    @computed_field
    def total(self) -> float:
        return sum([...])

    @property
    def percentages(self) -> dict:
        # 返回各项费用占比
```

| 字段 | 说明 | 适用存储类 |
|------|------|-----------|
| storage_cost | 存储空间费用 | 全部 |
| put_request_cost | PUT 请求费用 | 全部 |
| get_request_cost | GET 请求费用 | 全部 |
| retrieval_cost | 数据检索费用 | Glacier 类 |
| data_transfer_cost | 出站传输费用 | 全部 |
| lifecycle_cost | 生命周期转换费用 | 混合策略 |

### IntermediateMetrics - 中间指标

```python
class IntermediateMetrics(BaseModel):
    daily_data_gb: float        # 每日数据量
    avg_storage_gb: float       # 平均存储量
    monthly_puts: int           # 月度 PUT 次数
    monthly_gets: int           # 月度 GET 次数
    monthly_retrieval_gb: float # 月度检索量
    monthly_transfer_gb: float  # 月度传输量
```

### CostSummary - 成本汇总

```python
class CostSummary(BaseModel):
    monthly_cost: float         # 月度总成本 (USD)
    annual_cost: float          # 年度总成本 (USD)
    monthly_cost_per_device: float  # 单设备月成本
    breakdown: CostBreakdown    # 费用明细
    metrics: IntermediateMetrics  # 中间指标

    # 区域和存储类信息
    region: str
    storage_class: str

    # 元数据
    calculated_at: datetime
```

### ComparisonResult - 对比结果

```python
class ComparisonResult(BaseModel):
    configs: List[CostCalculationInput]
    results: List[CostSummary]
    lowest_cost_index: int
    savings: List[float]        # 相对最低方案的节省金额
    savings_percent: List[float]  # 节省百分比
```

---

## AWS 定价 Schema

**目录**: `backend/app/data/aws_pricing/`

### 定价 JSON 结构

```json
{
  "region": "ap-northeast-1",
  "region_name": "Asia Pacific (Tokyo)",
  "currency": "USD",
  "last_updated": "2024-01-01",

  "storage": {
    "STANDARD": {
      "price_per_gb": 0.025,
      "first_50tb": 0.025,
      "next_450tb": 0.024,
      "over_500tb": 0.023
    },
    "GLACIER_IR": {
      "price_per_gb": 0.004
    },
    "DEEP_ARCHIVE": {
      "price_per_gb": 0.002
    }
  },

  "requests": {
    "STANDARD": {
      "put_per_1000": 0.0047,
      "get_per_1000": 0.00037
    },
    "GLACIER_IR": {
      "put_per_1000": 0.02,
      "get_per_1000": 0.01,
      "retrieval_per_gb": 0.03
    }
  },

  "data_transfer": {
    "out_first_10tb": 0.114,
    "out_next_40tb": 0.089,
    "out_next_100tb": 0.086,
    "out_over_150tb": 0.084
  },

  "lifecycle": {
    "transition_per_1000": 0.02
  }
}
```

### 支持区域

| 区域代码 | 区域名称 |
|---------|---------|
| ap-northeast-1 | 亚太 (东京) |
| us-east-1 | 美国东部 (弗吉尼亚) |
| us-west-2 | 美国西部 (俄勒冈) |
| eu-west-1 | 欧洲 (爱尔兰) |
| ap-southeast-1 | 亚太 (新加坡) |

---

## 数据库表结构

### DynamoDB: Evaluations 表

| 属性 | 类型 | 说明 |
|------|------|------|
| evaluation_id (PK) | String | 评估 ID (UUID) |
| user_id | String | 用户 ID |
| name | String | 评估名称 |
| description | String | 描述 |
| input | Map | CostCalculationInput |
| result | Map | CostSummary |
| created_at | String | 创建时间 (ISO) |
| updated_at | String | 更新时间 (ISO) |
| tags | List[String] | 标签 |

### DynamoDB: Shares 表

| 属性 | 类型 | 说明 |
|------|------|------|
| share_id (PK) | String | 分享 ID (短码) |
| evaluation_id | String | 关联评估 ID |
| encrypted_data | String | 加密的评估数据 |
| expires_at | String | 过期时间 |
| created_at | String | 创建时间 |
| access_count | Number | 访问次数 |

### DynamoDB: CalculationRecords 表 [NEW v1.2.0]

| 属性 | 类型 | 说明 |
|------|------|------|
| record_id (PK) | String | 记录 ID (CALC#{timestamp}#{uuid8}) |
| user_id | String | 用户 ID (GSI) |
| name | String | 记录名称 |
| description | String | 描述 |
| storage_strategy | String | 存储策略类型 |
| input_params | Map | 输入参数快照 |
| intermediate_metrics | Map | 中间计算指标 |
| stage_details | List | 分阶段费用明细 |
| cost_summary | Map | 费用汇总 |
| pricing_snapshot | Map | 定价数据快照 |
| created_at | String | 创建时间 (ISO) |

**限制**: 每用户最多 1000 条记录

---

## API 请求/响应 Schema

### POST /api/v1/calculate

**请求**:
```json
{
  "functional": {
    "device_count": 100,
    "recording_mode": "continuous",
    "video_quality": "1080p",
    "access_pattern": 0.1,
    "retention_days": 30,
    "segment_strategy": "fixed_duration",
    "segment_value": 60
  },
  "technical": {
    "storage_class": "STANDARD",
    "lifecycle_policy": null
  },
  "pricing": {
    "region": "ap-northeast-1",
    "discount_percent": 0.0
  }
}
```

**响应**:
```json
{
  "monthly_cost": 1234.56,
  "annual_cost": 14814.72,
  "monthly_cost_per_device": 12.35,
  "breakdown": {
    "storage_cost": 800.00,
    "put_request_cost": 50.00,
    "get_request_cost": 5.00,
    "retrieval_cost": 0.00,
    "data_transfer_cost": 379.56,
    "lifecycle_cost": 0.00,
    "total": 1234.56
  },
  "metrics": {
    "daily_data_gb": 843.75,
    "avg_storage_gb": 12656.25,
    "monthly_puts": 4320000,
    "monthly_gets": 432000,
    "monthly_retrieval_gb": 2531.25,
    "monthly_transfer_gb": 2531.25
  },
  "region": "ap-northeast-1",
  "storage_class": "STANDARD",
  "calculated_at": "2026-01-26T00:00:00Z"
}
```

---

## 数据验证规则

| 字段 | 验证规则 |
|------|---------|
| device_count | 1 ≤ x ≤ 100000 |
| access_pattern | 0.0 ≤ x ≤ 1.0 |
| retention_days | 1 ≤ x ≤ 3650 |
| discount_percent | 0.0 ≤ x ≤ 50.0 |
| segment_value | x > 0 |
| lifecycle_policy.stages | 按 start_day 升序，无重叠 |

---

## 核算记录数据模型 [NEW v1.2.0]

**文件**: `backend/app/models/calculation_records.py`

### StorageStrategy - 存储策略枚举

```python
class StorageStrategy(str, Enum):
    SINGLE_STANDARD = "single_standard"           # 单一 S3 Standard
    SINGLE_GLACIER_IR = "single_glacier_ir"       # 单一 Glacier IR
    LIFECYCLE_STANDARD_TO_GLACIER = "lifecycle_std_glacier"  # 生命周期: Standard → Glacier
    LIFECYCLE_MULTI_STAGE = "lifecycle_multi_stage"  # 生命周期: 多阶段
```

### InputParameterSnapshot - 输入参数快照

```python
class InputParameterSnapshot(BaseModel):
    functional: FunctionalDimensionSnapshot   # 功能维度
    technical: TechnicalDimensionSnapshot     # 技术维度
    pricing: PricingDimensionSnapshot         # 价格维度
```

### IntermediateMetricsDetail - 中间计算指标

| 字段 | 说明 |
|------|------|
| daily_recording_seconds | 每日录像秒数 |
| daily_data_gb | 每日数据量 (GB) |
| avg_storage_gb | 平均存储量 (GB) |
| segments_per_day | 每日分片数 |
| monthly_puts | 月度 PUT 请求数 |
| monthly_gets | 月度 GET 请求数 |
| monthly_retrieval_gb | 月度检索量 (GB) |
| monthly_transfer_gb | 月度传输量 (GB) |
| access_pattern_mode | 访问模式 (simple/time_decay) |

### StageCostDetail - 阶段费用明细

| 字段 | 说明 |
|------|------|
| stage_index | 阶段索引 |
| start_day / end_day | 开始/结束天数 |
| storage_class | 存储类型 |
| access_rate | 访问比例 |
| storage_cost | 存储费用 (CostItemDetail) |
| put_request_cost | PUT 请求费用 |
| get_request_cost | GET 请求费用 |
| retrieval_cost | 检索费用 (可选) |
| transition_cost | 转换费用 (可选) |
| stage_total | 阶段总费用 |

### CostSummaryDetail - 费用汇总

| 字段 | 说明 |
|------|------|
| storage_cost | 存储费用 |
| put_request_cost | PUT 请求费用 |
| get_request_cost | GET 请求费用 |
| retrieval_cost | 检索费用 |
| lifecycle_cost | 生命周期转换费用 |
| data_transfer_cost | 数据传输费用 |
| total_cost | 总成本 |
| cost_per_device | 单设备成本 |
| cost_per_gb | 单 GB 成本 |
| breakdown_percent | 费用占比 |

### PricingSnapshot - 定价快照

```python
class PricingSnapshot(BaseModel):
    region: str                              # AWS 区域代码
    region_name: str                         # 区域名称
    currency: str = "USD"                    # 货币
    snapshot_date: str                       # 快照日期
    storage_pricing: Dict[str, StorageClassPricing]  # 各存储类型定价
    data_transfer_tiers: List[DataTransferTier]      # 数据传输阶梯
```

### CalculationRecord - 核算记录主体

```python
class CalculationRecord(BaseModel):
    record_id: str                           # 记录 ID
    user_id: str                             # 用户 ID
    name: str                                # 记录名称
    description: str                         # 描述
    created_at: datetime                     # 创建时间
    storage_strategy: StorageStrategy        # 存储策略类型
    input_params: InputParameterSnapshot     # 输入参数快照
    intermediate_metrics: IntermediateMetricsDetail  # 中间计算指标
    stage_details: List[StageCostDetail]     # 分阶段费用明细
    cost_summary: CostSummaryDetail          # 费用汇总
    pricing_snapshot: PricingSnapshot        # 定价快照
```

---

## 核算记录 API Schema [NEW v1.2.0]

### POST /api/v1/calculate-detailed

**请求**: CostCalculationInput (同 /calculate)

**响应** (DetailedCalculationResult):
```json
{
  "summary": {
    "storage_cost": 10.50,
    "put_request_cost": 0.25,
    "get_request_cost": 0.01,
    "retrieval_cost": 0.00,
    "lifecycle_cost": 0.00,
    "data_transfer_cost": 0.30,
    "subtotal": 11.06,
    "discount_amount": 0.00,
    "total_cost": 11.06,
    "cost_per_device": 1.106,
    "cost_per_gb": 0.0088,
    "breakdown_percent": {...}
  },
  "intermediate_metrics": {...},
  "stage_details": [...],
  "storage_strategy": "single_standard",
  "pricing_snapshot": {...}
}
```

### POST /api/v1/calculation-records

**请求**:
```json
{
  "name": "我的核算记录",
  "description": "测试描述",
  "functional": {...},
  "technical": {...},
  "pricing": {...}
}
```

**响应**: CalculationRecord 完整对象

### GET /api/v1/calculation-records

**参数**: page, page_size, search, sort_by, sort_order

**响应**:
```json
{
  "items": [
    {
      "record_id": "CALC#20260131143000#a1b2c3d4",
      "name": "我的核算记录",
      "storage_strategy": "single_standard",
      "total_cost": 11.06,
      "created_at": "2026-01-31T14:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
