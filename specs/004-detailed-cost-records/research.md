# Research: 详细成本核算记录

**Feature**: 004-detailed-cost-records
**Date**: 2026-01-31

## 研究主题

### 1. 现有 DetailedCostBreakdown 模型复用

**决策**: 直接复用现有 `DetailedCostBreakdown` 模型，不重新设计

**理由**:
- `backend/app/models/results.py` 已定义完整的详细费用明细模型
- `LifecycleCalculator.calculate_with_details()` 已返回 `(CostSummary, DetailedCostBreakdown)`
- 模型包含所有必要字段：`CostItem`（单价、用量、金额）、`StageCostBreakdown`（分阶段明细）、`TierDetail`（阶梯定价）

**替代方案考虑**:
- 新建独立模型：会导致代码重复，增加维护成本
- 扩展现有模型：不需要，现有模型已足够完整

### 2. S3StandardCalculator 详细明细支持

**决策**: 为 `S3StandardCalculator` 添加 `calculate_with_details()` 方法

**理由**:
- 现有 `calculate()` 方法仅返回 `CostSummary`
- 用户可能使用单一存储类型（非生命周期）场景
- 保持与 `LifecycleCalculator` 接口一致性

**实现方案**:
```python
class S3StandardCalculator(BaseCalculator):
    def calculate_with_details(self, input_data: CostCalculationInput) -> tuple[CostSummary, DetailedCostBreakdown]:
        summary = self.calculate(input_data)
        detailed = self._build_single_stage_details(input_data, summary)
        return summary, detailed
```

### 3. 定价快照捕获策略

**决策**: 从 `PricingService` 获取完整定价数据并序列化存储

**理由**:
- 遵循 Constitution 原则 V（定价数据外部化）
- 确保核算记录可重现性
- DynamoDB 400KB 限制足够存储定价数据

**数据结构**:
```python
class PricingSnapshot(BaseModel):
    region: str                           # AWS 区域代码
    region_name: str                      # 区域名称
    currency: str = "USD"                 # 货币
    snapshot_date: str                    # 快照日期 (ISO 8601)
    storage_classes: Dict[str, Dict]      # 各存储类型定价
    data_transfer_tiers: List[Dict]       # 数据传输阶梯定价
```

### 4. 实时计算防抖策略

**决策**: 前端 500ms 防抖 + 后端新增 `/calculate-detailed` 端点

**理由**:
- 500ms 是用户感知流畅与减少 API 调用的平衡点
- 独立端点避免修改现有 `/calculate` 行为
- 未登录用户也可使用实时预览

**前端实现**:
```typescript
// 使用 useDebouncedCallback
const debouncedCalculate = useDebouncedCallback(
  async (input: CostCalculationInput) => {
    const result = await calculationApi.calculateDetailed(input);
    setDetailedCost(result);
  },
  500
);
```

### 5. 默认值配置

**决策**: 在后端定义典型场景默认值，通过 API 提供给前端

**理由**:
- 单一数据源，避免前后端不一致
- 便于后续调整默认值
- 支持未来扩展多种预设场景

**默认值定义**:
```python
DEFAULT_FUNCTIONAL = FunctionalDimensions(
    device_count=10,
    recording_mode=RecordingMode.EVENT_TRIGGERED,
    video_quality=VideoQuality.HD_1080P,
    retention_days=30,
    events_per_day=50,
    event_duration_seconds=30,
    access_pattern=0.1,
)
DEFAULT_TECHNICAL = TechnicalDimensions(
    storage_class=StorageClass.STANDARD,
    segment_strategy=SegmentStrategy.FIXED_DURATION,
    segment_seconds=10,
)
DEFAULT_PRICING = PricingDimensions(
    region="us-east-1",
    discount_percent=0,
)
```

### 6. DynamoDB 表设计

**决策**: 独立新表 `ipc_cost_calculation_records`，PK=user_id, SK=record_id

**理由**:
- 与 evaluations 功能完全独立（规格约束）
- 按用户分区，支持高效查询
- SK 格式 `CALC#{timestamp}#{uuid8}` 支持时间排序

**表结构**:
| 属性 | 类型 | 说明 |
|------|------|------|
| user_id (PK) | String | 用户 ID |
| record_id (SK) | String | 格式: `CALC#{timestamp}#{uuid8}` |
| name | String | 记录名称 |
| description | String | 描述（可选） |
| created_at | String | 创建时间 (ISO 8601) |
| storage_strategy | String | 存储策略类型 |
| input_params | Map | 输入参数快照 (JSON) |
| intermediate_metrics | Map | 中间计算指标 (JSON) |
| stage_details | List | 分阶段费用明细 (JSON) |
| cost_summary | Map | 费用汇总 (JSON) |
| pricing_snapshot | Map | 定价快照 (JSON) |

### 7. 前端组件复用策略

**决策**: 新建专用组件，复用样式和布局模式

**理由**:
- 详情页结构与 `EvaluationDetail.tsx` 不同（更详细）
- 实时预览需要专门的交互逻辑
- 复用 Ant Design 组件和项目样式规范

**组件规划**:
- `DetailedCostPreview.tsx`: 实时预览展示（中间指标、分阶段费用、汇总）
- `SaveRecordDialog.tsx`: 保存对话框（名称、描述输入）
- `CalculationRecords.tsx`: 列表页（复用 Evaluations.tsx 布局）
- `CalculationRecordDetail.tsx`: 详情页（专用布局，展示完整核算信息）

## 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| DynamoDB 400KB 限制 | 高 | 定价快照仅存储必要字段，监控记录大小 |
| 实时计算性能 | 中 | 前端防抖 + 后端计算优化 |
| 数据一致性 | 低 | 记录不可修改（CRD），快照机制保证可重现 |

## 结论

所有技术问题已解决，无需进一步澄清。可以进入 Phase 1 设计阶段。
