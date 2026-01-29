# 详细成本核算记录功能设计

## 概述

实现"详细成本核算记录"功能，让用户能够生成、存储和查看完整的可归因成本核算信息。

**核心价值**：现有 `CostSummary` 仅提供费用汇总，新功能提供完整的计算过程追溯：
- 中间指标（每日数据量、请求数等的来源）
- 分阶段费用明细（每个存储阶段的详细计算）
- 定价快照（记录计算时的定价数据）

## 设计约束

| 约束 | 说明 |
|------|------|
| 与 evaluations 完全独立 | 新表、新 API、新页面，不修改现有功能 |
| 用户主动触发 | 用户点击按钮才生成，避免自动保存大量数据 |
| 独立详情页面 | `/calculation-records/:id` 专门展示详细核算 |
| CRD 操作 | 仅支持创建、查看、删除，保持核算结果不可篡改 |

---

## 1. 后端实现

### 1.1 关键发现：可复用的现有代码

`LifecycleCalculator.calculate_with_details()` 已返回 `DetailedCostBreakdown`，包含：
- `StageCostBreakdown` 列表（分阶段成本）
- `CostItem`（单价、用量、金额的详细信息）
- `TierDetail`（阶梯定价明细）
- `PricingMetadata`（定价来源信息）

**策略**：基于现有模型扩展，而非重新设计。

### 1.2 新增 Pydantic 模型

文件：`backend/app/models/calculation_records.py`

```python
# 存储策略枚举
class StorageStrategy(str, Enum):
    SINGLE_STANDARD = "single_standard"
    SINGLE_GLACIER_IR = "single_glacier_ir"
    LIFECYCLE_STANDARD_TO_GLACIER_IR = "lifecycle_standard_to_glacier_ir"
    LIFECYCLE_MULTI_STAGE = "lifecycle_multi_stage"

# 输入参数快照（用于完整存储）
class CalculationInputSnapshot(BaseModel):
    functional: Dict[str, Any]
    technical: Dict[str, Any]
    pricing: Dict[str, Any]

# 详细中间指标（扩展现有 IntermediateMetrics）
class IntermediateMetricsDetail(BaseModel):
    daily_recording_seconds: float
    daily_data_kb: float
    daily_data_gb: float
    monthly_data_gb: float
    avg_storage_gb: float
    avg_storage_tb: float
    segments_per_event: float
    segments_per_day: float
    monthly_puts: float
    monthly_gets: float
    monthly_retrieval_gb: float
    monthly_transfer_gb: float

# 定价快照（扩展现有 PricingMetadata）
class PricingSnapshot(BaseModel):
    region: str
    region_name: str
    currency: str = "USD"
    snapshot_date: str
    storage_classes: Dict[str, Dict[str, float]]
    data_transfer: Dict[str, float]

# 费用占比
class CostBreakdownPercent(BaseModel):
    storage: float
    put_requests: float
    get_requests: float
    retrieval: float
    lifecycle: float
    data_transfer: float

# 完整费用汇总
class CostSummaryDetail(BaseModel):
    storage_cost: float
    put_request_cost: float
    get_request_cost: float
    retrieval_cost: float
    lifecycle_cost: float
    data_transfer_cost: float
    subtotal: float
    discount_amount: float
    total_cost: float
    cost_per_device: float
    cost_per_gb: float
    cost_breakdown_percent: CostBreakdownPercent

# 核算记录完整数据
class CalculationRecordData(BaseModel):
    record_id: str
    user_id: str
    created_at: str
    name: str
    description: str
    scenario_type: Optional[str]
    storage_strategy: StorageStrategy
    input_params: CalculationInputSnapshot
    intermediate_metrics: IntermediateMetricsDetail
    stage_cost_details: List[Dict]  # 复用现有 StageCostBreakdown 的 JSON
    cost_summary: CostSummaryDetail
    pricing_snapshot: PricingSnapshot
```

### 1.3 API 端点

文件：`backend/app/api/routes/calculation_records.py`

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/v1/calculation-records` | 创建核算记录 |
| GET | `/api/v1/calculation-records` | 列出用户记录 |
| GET | `/api/v1/calculation-records/{record_id}` | 获取单条记录 |
| DELETE | `/api/v1/calculation-records/{record_id}` | 删除记录 |

**请求模型**：
```python
class CreateCalculationRecordRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    scenario_type: Optional[str] = None
    input_data: CostCalculationInput
```

### 1.4 核算记录生成器

文件：`backend/app/services/calculation_record_generator.py`

**核心逻辑**：
1. 确定存储策略类型 (`StorageStrategy`)
2. 调用现有计算器获取 `DetailedCostBreakdown`
3. 扩展计算中间指标的详细信息
4. 捕获当前定价数据快照
5. 组装 `CalculationRecordData`

```python
class CalculationRecordGenerator:
    def generate(
        self,
        input_data: CostCalculationInput,
        name: str,
        description: str = "",
        scenario_type: Optional[str] = None,
    ) -> CalculationRecordData:
        # 1. 确定存储策略
        strategy = self._determine_storage_strategy(input_data)

        # 2. 调用计算器获取详细明细
        if lifecycle_enabled:
            calculator = LifecycleCalculator()
            summary, detailed = calculator.calculate_with_details(input_data)
        else:
            calculator = S3StandardCalculator()
            summary = calculator.calculate(input_data)
            detailed = self._build_single_stage_details(input_data, summary)

        # 3. 扩展中间指标
        metrics = self._calculate_extended_metrics(input_data, summary.metrics)

        # 4. 捕获定价快照
        pricing_snapshot = self._capture_pricing_snapshot(input_data)

        # 5. 构建完整记录
        return CalculationRecordData(...)
```

### 1.5 数据访问层

文件：`backend/app/db/repositories/calculation_records.py`

```python
class CalculationRecordRepository:
    TABLE_NAME = "ipc_cost_calculation_records"

    def create(self, user_id: str, data: CalculationRecordData) -> str:
        """创建记录，返回 record_id"""

    def list_by_user(
        self, user_id: str, limit: int = 20, sort_by: str = "created_at"
    ) -> List[CalculationRecordData]:
        """列出用户的所有记录"""

    def get(self, user_id: str, record_id: str) -> Optional[CalculationRecordData]:
        """获取单条记录"""

    def delete(self, user_id: str, record_id: str) -> bool:
        """删除记录"""
```

### 1.6 DynamoDB 表设计

**表名**：`ipc_cost_calculation_records`

| 键类型 | 属性名 | 类型 | 说明 |
|--------|--------|------|------|
| PK | `user_id` | String | 用户 ID |
| SK | `record_id` | String | 格式: `CALC#{timestamp}#{uuid8}` |

**GSI 索引**（可选，按需添加）：
- `gsi_by_scenario`: PK=`scenario_type`, SK=`created_at`
- `gsi_by_storage`: PK=`storage_strategy`, SK=`total_cost`

---

## 2. 前端实现

### 2.1 路由配置

```tsx
// App.tsx
<Route path="calculation-records" element={<CalculationRecords />} />
<Route path="calculation-records/:id" element={<CalculationRecordDetail />} />
```

### 2.2 新增页面

**`CalculationRecords.tsx`** - 列表页面：
- 表格：名称、场景类型、存储策略、总成本、创建时间
- 操作：查看详情、删除（带确认）
- 搜索、排序、分页

**`CalculationRecordDetail.tsx`** - 详情页面：
- 基本信息卡片
- 输入参数三栏展示（功能/技术/价格维度）
- 中间指标卡片（数据量、请求数、检索量）
- 分阶段费用表格（可折叠展示每阶段详情）
- 费用汇总卡片 + 占比饼图
- 定价快照折叠面板

### 2.3 Calculator 页面集成

**新增按钮**：在 `ResultDisplay` 区域添加"生成详细核算"按钮

**新增对话框**：`CreateCalculationRecordDialog.tsx`
- 输入：名称、描述、场景类型
- 提交后跳转到详情页或显示成功提示

### 2.4 API 客户端

```typescript
// api/calculationRecords.ts
export const calculationRecordApi = {
  create: (data: CreateRequest) => post('/calculation-records', data),
  list: (params?: ListParams) => get('/calculation-records', { params }),
  get: (id: string) => get(`/calculation-records/${id}`),
  delete: (id: string) => del(`/calculation-records/${id}`),
};
```

### 2.5 类型定义

```typescript
// types/calculationRecords.ts
interface CalculationRecord {
  record_id: string;
  user_id: string;
  created_at: string;
  name: string;
  description: string;
  scenario_type?: string;
  storage_strategy: StorageStrategy;
  input_params: CalculationInputSnapshot;
  intermediate_metrics: IntermediateMetricsDetail;
  stage_cost_details: StageCostDetail[];
  cost_summary: CostSummaryDetail;
  pricing_snapshot: PricingSnapshot;
}
```

---

## 3. 实现步骤

### Phase 1: 后端模型和服务 (优先)

1. **创建数据模型** `backend/app/models/calculation_records.py`
   - 定义所有 Pydantic 模型
   - 参考现有 `results.py` 的模式

2. **创建核算生成器** `backend/app/services/calculation_record_generator.py`
   - 复用 `LifecycleCalculator.calculate_with_details()`
   - 复用 `S3StandardCalculator.calculate()`
   - 添加定价快照捕获逻辑

3. **创建数据仓库** `backend/app/db/repositories/calculation_records.py`
   - 参考 `evaluations.py` 的模式
   - 实现 CRUD 操作

### Phase 2: 后端 API

4. **创建 API 路由** `backend/app/api/routes/calculation_records.py`
   - 参考 `evaluations.py` 的认证和权限模式
   - 实现 4 个端点

5. **注册路由** 更新 `backend/app/api/routes/__init__.py`

6. **更新配置** `backend/app/core/config.py` 添加表名

### Phase 3: 前端类型和 API

7. **添加类型定义** `frontend/src/types/calculationRecords.ts`

8. **添加 API 客户端** `frontend/src/api/calculationRecords.ts`

### Phase 4: 前端页面

9. **创建列表页** `frontend/src/pages/CalculationRecords.tsx`
   - 参考 `Evaluations.tsx` 的布局

10. **创建详情页** `frontend/src/pages/CalculationRecordDetail.tsx`
    - 参考 `EvaluationDetail.tsx` 的布局

11. **创建对话框** `frontend/src/components/calculator/CreateCalculationRecordDialog.tsx`

12. **集成到 Calculator** 添加"生成详细核算"按钮

13. **更新路由** `frontend/src/App.tsx`

14. **更新导航** `frontend/src/components/common/Layout.tsx`

### Phase 5: 测试和验证

15. **后端单元测试**
16. **前端 E2E 测试**

---

## 4. 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/app/models/calculation_records.py` | 新建 | 核算记录数据模型 |
| `backend/app/services/calculation_record_generator.py` | 新建 | 核算生成服务 |
| `backend/app/db/repositories/calculation_records.py` | 新建 | 数据访问层 |
| `backend/app/api/routes/calculation_records.py` | 新建 | API 路由 |
| `backend/app/api/routes/__init__.py` | 修改 | 注册新路由 |
| `backend/app/core/config.py` | 修改 | 添加表名配置 |
| `frontend/src/types/calculationRecords.ts` | 新建 | 类型定义 |
| `frontend/src/api/calculationRecords.ts` | 新建 | API 客户端 |
| `frontend/src/pages/CalculationRecords.tsx` | 新建 | 列表页面 |
| `frontend/src/pages/CalculationRecordDetail.tsx` | 新建 | 详情页面 |
| `frontend/src/components/calculator/CreateCalculationRecordDialog.tsx` | 新建 | 创建对话框 |
| `frontend/src/pages/Calculator.tsx` | 修改 | 添加触发按钮 |
| `frontend/src/App.tsx` | 修改 | 添加路由 |
| `frontend/src/components/common/Layout.tsx` | 修改 | 添加导航项 |

---

## 5. 验证方案

### 后端验证

```bash
# 运行单元测试
cd backend
pytest tests/test_calculation_records.py -v

# 手动测试 API
curl -X POST http://localhost:8000/api/v1/calculation-records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试记录","input_data":{...}}'
```

### 前端验证

1. 访问 `/calculator` 页面，填写参数
2. 点击"生成详细核算"按钮
3. 验证对话框弹出，输入名称后提交
4. 验证跳转到详情页，展示完整核算信息
5. 访问 `/calculation-records` 验证列表显示
6. 测试删除功能

### E2E 测试

```bash
cd frontend
npm run test:e2e
```

---

## 6. 风险和注意事项

1. **数据量控制**：`stage_cost_details` 和 `pricing_snapshot` 可能较大，DynamoDB 单项限制 400KB
2. **向后兼容**：`S3StandardCalculator` 没有 `calculate_with_details()`，需要额外实现或转换
3. **定价快照**：需要从 `PricingService` 获取完整定价数据，可能需要新增方法

---

## 7. 参考文档

- [成本核算记录表设计](./cost-calculation-record-design.md) - 原始需求设计
- [项目设计文档](./plans/2025-01-24-ipc-cost-evaluator-design.md) - 项目整体架构
