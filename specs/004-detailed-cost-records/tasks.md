# Tasks: 详细成本核算记录

**Input**: Design documents from `/specs/004-detailed-cost-records/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are omitted unless user explicitly requests TDD approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/` (Python/FastAPI)
- **Frontend**: `frontend/src/` (React/TypeScript)
- **Infrastructure**: `infra/lib/` (AWS CDK)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, DynamoDB table creation, and configuration

- [x] T001 添加 DynamoDB 表定义到 `infra/lib/constructs/dynamodb-tables.ts`，创建 `ipc_cost_calculation_records` 表
- [x] T002 [P] 添加表名配置到 `backend/app/core/config.py`
- [x] T003 [P] 创建核算记录数据模型文件 `backend/app/models/calculation_records.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models and services that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Core Models

- [x] T004 [P] 实现 `StorageStrategy` 枚举到 `backend/app/models/calculation_records.py`
- [x] T005 [P] 实现 `FunctionalDimensionSnapshot`, `TechnicalDimensionSnapshot`, `PricingDimensionSnapshot` 模型到 `backend/app/models/calculation_records.py`
- [x] T006 [P] 实现 `InputParameterSnapshot` 模型到 `backend/app/models/calculation_records.py`
- [x] T007 [P] 实现 `IntermediateMetricsDetail` 模型到 `backend/app/models/calculation_records.py`
- [x] T008 [P] 实现 `CostItemDetail`, `TierDetailSnapshot`, `StageCostDetail` 模型到 `backend/app/models/calculation_records.py`
- [x] T009 [P] 实现 `CostBreakdownPercent`, `CostSummaryDetail` 模型到 `backend/app/models/calculation_records.py`
- [x] T010 [P] 实现 `StorageClassPricing`, `DataTransferTier`, `PricingSnapshot` 模型到 `backend/app/models/calculation_records.py`
- [x] T011 实现 `CalculationRecord` 主模型到 `backend/app/models/calculation_records.py` (依赖 T004-T010)

### Backend Core Services

- [x] T012 为 `S3StandardCalculator` 添加 `calculate_with_details()` 方法到 `backend/app/services/calculator/s3_standard.py`
- [x] T013 创建 `CalculationRecordGenerator` 服务到 `backend/app/services/calculation_record_generator.py` (依赖 T011, T012)
- [x] T014 创建数据访问层 `CalculationRecordRepository` 到 `backend/app/db/repositories/calculation_records.py` (依赖 T011)

### Backend API Foundation

- [x] T015 创建 API 路由文件 `backend/app/api/routes/calculation_records.py`，注册到主路由
- [x] T016 [P] 定义 API 请求/响应模型到 `backend/app/api/routes/calculation_records.py`

### Frontend Core Types

- [x] T017 [P] 创建 TypeScript 类型定义文件 `frontend/src/types/calculationRecords.ts`
- [x] T018 [P] 创建 API 客户端 `frontend/src/api/calculationRecords.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 0 - 实时预览详细核算 (Priority: P1) 🎯 MVP

**Goal**: 用户在填写成本计算参数时，系统提供合理的默认值，参数修改后实时显示详细核算信息

**Independent Test**: 可以通过修改任意输入参数并验证详细核算信息在500ms内自动更新来独立测试

### Backend Implementation for US0

- [x] T019 [US0] 实现默认值配置 `get_default_input()` 方法到 `backend/app/services/calculation_record_generator.py`
- [x] T020 [US0] 实现 `GET /api/v1/defaults` 端点到 `backend/app/api/routes/calculation_records.py`
- [x] T021 [US0] 实现 `POST /api/v1/calculate-detailed` 端点到 `backend/app/api/routes/calculation_records.py`

### Frontend Implementation for US0

- [x] T022 [P] [US0] 创建详细核算预览组件 `frontend/src/components/calculator/DetailedCostPreview.tsx`
- [x] T023 [P] [US0] 创建中间计算指标展示组件 `frontend/src/components/calculator/IntermediateMetrics.tsx`
- [x] T024 [P] [US0] 创建分阶段费用表格组件 `frontend/src/components/calculator/StageCostTable.tsx`
- [x] T025 [US0] 集成实时预览到 Calculator 页面，添加 500ms 防抖逻辑到 `frontend/src/pages/Calculator.tsx` (依赖 T022-T024)
- [x] T026 [US0] 实现加载状态和错误处理到 `frontend/src/components/calculator/DetailedCostPreview.tsx`

**Checkpoint**: User Story 0 完成 - 实时预览功能可独立验证

---

## Phase 4: User Story 1 - 生成详细核算记录 (Priority: P1) 🎯 MVP

**Goal**: 用户可以将当前计算结果保存为核算记录，记录包含完整的输入参数、中间计算过程和费用明细

**Independent Test**: 可以通过在成本计算页面点击"保存核算记录"按钮并验证记录被成功创建来独立测试

### Backend Implementation for US1

- [x] T027 [US1] 实现 `POST /api/v1/calculation-records` 端点到 `backend/app/api/routes/calculation_records.py`
- [x] T028 [US1] 实现 `create_record()` 方法到 `backend/app/db/repositories/calculation_records.py`
- [x] T029 [US1] 实现用户记录数量限制检查 (1000条上限) 到 `backend/app/db/repositories/calculation_records.py`

### Frontend Implementation for US1

- [x] T030 [P] [US1] 创建保存对话框组件 `frontend/src/components/calculator/SaveRecordDialog.tsx`
- [x] T031 [US1] 集成保存按钮和对话框到 Calculator 页面 `frontend/src/pages/Calculator.tsx` (依赖 T030)
- [x] T032 [US1] 实现按钮状态控制逻辑（登录检查、计算状态、错误状态、上限检查）到 `frontend/src/pages/Calculator.tsx`

**Checkpoint**: User Story 1 完成 - 保存核算记录功能可独立验证

---

## Phase 5: User Story 2 - 查看核算记录详情 (Priority: P1)

**Goal**: 用户可以查看已保存的核算记录详情，包括完整的输入参数、计算中间值、分阶段费用明细

**Independent Test**: 可以通过访问核算记录详情页面并验证所有信息正确展示来独立测试

### Backend Implementation for US2

- [x] T033 [US2] 实现 `GET /api/v1/calculation-records/{record_id}` 端点到 `backend/app/api/routes/calculation_records.py`
- [x] T034 [US2] 实现 `get_record()` 方法到 `backend/app/db/repositories/calculation_records.py`

### Frontend Implementation for US2

- [ ] T035 [P] [US2] 创建详情页面 `frontend/src/pages/CalculationRecordDetail.tsx`
- [ ] T036 [P] [US2] 创建输入参数展示组件 `frontend/src/components/calculator/InputParamsDisplay.tsx`
- [ ] T037 [P] [US2] 创建定价快照展示组件 `frontend/src/components/calculator/PricingSnapshotDisplay.tsx`
- [ ] T038 [US2] 实现详情页完整布局（6个区块）到 `frontend/src/pages/CalculationRecordDetail.tsx` (依赖 T35-T37)
- [ ] T039 [US2] 添加详情页路由到 `frontend/src/App.tsx`
- [ ] T040 [US2] 实现详情页 404/403 错误处理到 `frontend/src/pages/CalculationRecordDetail.tsx`

**Checkpoint**: User Story 2 完成 - 详情查看功能可独立验证

---

## Phase 6: User Story 3 - 管理核算记录列表 (Priority: P2)

**Goal**: 用户可以查看和管理自己的核算记录历史，包括浏览列表、按名称搜索和删除记录

**Independent Test**: 可以通过访问核算记录列表页面并测试列表展示、排序、删除功能来独立测试

### Backend Implementation for US3

- [x] T041 [US3] 实现 `GET /api/v1/calculation-records` 端点（分页、排序、搜索）到 `backend/app/api/routes/calculation_records.py`
- [x] T042 [US3] 实现 `list_records()` 方法到 `backend/app/db/repositories/calculation_records.py`
- [x] T043 [US3] 实现 `DELETE /api/v1/calculation-records/{record_id}` 端点到 `backend/app/api/routes/calculation_records.py`
- [x] T044 [US3] 实现 `delete_record()` 方法到 `backend/app/db/repositories/calculation_records.py`

### Frontend Implementation for US3

- [ ] T045 [P] [US3] 创建列表页面 `frontend/src/pages/CalculationRecords.tsx`
- [ ] T046 [US3] 实现列表页加载状态（骨架屏）和错误处理到 `frontend/src/pages/CalculationRecords.tsx`
- [ ] T047 [US3] 实现删除确认对话框和删除功能到 `frontend/src/pages/CalculationRecords.tsx`
- [ ] T048 [US3] 实现空状态提示和引导到 `frontend/src/pages/CalculationRecords.tsx`
- [ ] T049 [US3] 添加列表页路由到 `frontend/src/App.tsx`
- [ ] T050 [US3] 添加导航栏入口到核算记录列表页

**Checkpoint**: User Story 3 完成 - 列表管理功能可独立验证

---

## Phase 7: User Story 4 - 输入参数结构化展示 (Priority: P2)

**Goal**: 详情页清晰展示成本计算的输入参数，分为功能维度、技术维度、价格维度三类

**Independent Test**: 可以通过查看详情页的输入参数区块并验证三类维度正确分组展示来独立测试

### Frontend Implementation for US4

- [ ] T051 [P] [US4] 增强输入参数展示组件，实现三卡片布局到 `frontend/src/components/calculator/InputParamsDisplay.tsx`
- [ ] T052 [US4] 实现枚举值中文友好标签映射到 `frontend/src/utils/enumLabels.ts`
- [ ] T053 [US4] 集成枚举标签映射到输入参数展示组件

**Checkpoint**: User Story 4 完成 - 参数结构化展示功能可独立验证

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T054 [P] 实现 XSS 防护（名称和描述字段 HTML 转义）
- [ ] T055 [P] 验证数据大小限制（200KB 安全限制）
- [ ] T056 [P] 添加请求日志和监控
- [ ] T057 执行 quickstart.md 验证流程
- [ ] T058 代码清理和重构

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational)
    ↓
    ├── US0 (P1) - 实时预览 [可独立开始]
    │       ↓
    │       ├── US1 (P1) - 生成记录 [依赖 US0 的实时预览组件复用]
    │       │       ↓
    │       │       └── US2 (P1) - 查看详情 [依赖 US1 有记录可查看]
    │       │               ↓
    │       │               └── US3 (P2) - 列表管理 [依赖 US2 详情页跳转]
    │       │                       ↓
    │       │                       └── US4 (P2) - 参数展示 [依赖 US3 作为展示增强]
    │       │
    │       └── (US2-US4 可与 US1 并行开发，但集成测试需要数据)
    │
    ↓
Phase 8 (Polish)
```

### Within Each User Story

- Models before services
- Services before endpoints
- Backend before frontend (API 先行)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 内部并行**:
```bash
# 可同时进行:
T004, T005, T006, T007, T008, T009, T010 (所有模型定义)
T017, T018 (前端类型定义)
```

**User Story 0 内部并行**:
```bash
# 可同时进行:
T022, T023, T024 (前端组件)
```

**User Story 2 内部并行**:
```bash
# 可同时进行:
T035, T036, T037 (详情页组件)
```

---

## Parallel Example: Phase 2 Models

```bash
# 启动所有模型定义任务:
Task: "T004 实现 StorageStrategy 枚举"
Task: "T005 实现 FunctionalDimensionSnapshot 等快照模型"
Task: "T006 实现 InputParameterSnapshot 模型"
Task: "T007 实现 IntermediateMetricsDetail 模型"
Task: "T008 实现 CostItemDetail 等费用明细模型"
Task: "T009 实现 CostSummaryDetail 模型"
Task: "T010 实现 PricingSnapshot 模型"
Task: "T017 创建 TypeScript 类型定义"
Task: "T018 创建 API 客户端"
```

---

## Implementation Strategy

### MVP First (User Story 0 + 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 0 (实时预览)
4. Complete Phase 4: User Story 1 (生成记录)
5. **STOP and VALIDATE**: 测试实时预览和保存功能
6. 可部署/演示 MVP

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. User Story 0 → 测试独立 → 实时预览可用
3. User Story 1 → 测试独立 → 保存功能可用 (MVP!)
4. User Story 2 → 测试独立 → 详情查看可用
5. User Story 3 → 测试独立 → 列表管理可用
6. User Story 4 → 测试独立 → 参数展示增强
7. 每个 Story 独立增值，不破坏已有功能

### Recommended MVP Scope

**建议 MVP 范围**: User Story 0 + User Story 1

- 实时预览详细核算 (US0)
- 保存核算记录 (US1)

这两个故事组合提供了核心价值：用户可以看到详细计算过程并保存记录。

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
