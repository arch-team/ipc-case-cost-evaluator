# Tasks: IPC Case Cost Evaluator

**Input**: Design documents from `/specs/001-ipc-cost-evaluator/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 测试任务按需包含，每个用户故事完成后应运行验收测试

**Organization**: 任务按用户故事分组，支持独立实现和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事 (US1, US2, US3...)
- 包含精确文件路径

## Path Conventions

- **Backend**: `backend/app/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup (项目初始化) ✅

**Purpose**: 确认项目结构和依赖完整

**Status**: ✅ 完成 (2026-01-25) | [Eval Report](.claude/evals/phase1-setup.md)

- [x] T001 确认 backend/ 目录结构符合 plan.md 规范
- [x] T002 确认 frontend/ 目录结构符合 plan.md 规范
- [x] T003 [P] 验证 backend/requirements.txt 包含所有必要依赖
- [x] T004 [P] 验证 frontend/package.json 包含所有必要依赖
- [x] T005 [P] 创建 backend/app/data/scenarios/ 目录并添加预设场景 JSON (8个场景)
- [x] T006 [P] 创建 backend/app/data/lifecycle_templates/ 目录并添加生命周期模板 JSON (4个模板)

---

## Phase 2: Foundational (基础设施) ✅

**Purpose**: 核心基础设施，所有用户故事依赖此阶段

**Status**: ✅ 完成 (2026-01-25) | [Eval Report](../../.claude/evals/phase2-foundational.md)

- [x] T007 实现 JWT 认证服务 in backend/app/services/auth.py
- [x] T008 [P] 创建认证模型 in backend/app/api/routes/auth.py (内联定义)
- [x] T009 [P] 实现认证路由 in backend/app/api/routes/auth.py
- [x] T010 配置 DynamoDB 客户端连接 in backend/app/db/dynamodb_client.py
- [x] T011 [P] 创建用户仓库 in backend/app/services/auth.py (内嵌实现)
- [x] T012 [P] 验证现有 AWS 定价数据完整性 in backend/app/data/aws_pricing/ (5个区域)
- [x] T013 配置环境变量和 JWT 密钥 in backend/app/core/config.py
- [x] T014 [P] 创建前端 API 客户端基础 in frontend/src/api/client.ts
- [x] T015 [P] 配置前端路由结构 in frontend/src/App.tsx (4个页面路由)

**Checkpoint**: ✅ 基础设施就绪 - 用户故事实现可以开始

---

## Phase 3: User Story 1 - 单一存储方案成本计算 (Priority: P1) 🎯 MVP ✅

**Goal**: 用户输入三维度参数，获得单一存储方案的详细费用明细

**Status**: ✅ 完成 (2026-01-25) | [Eval Report](../../.claude/evals/phase3-us1-single-calculation.md)

**Independent Test**: 调用 POST /api/v1/calculate 返回完整的 CostSummary ✅

### Backend Implementation

- [x] T016 [P] [US1] 验证 FunctionalDimensions 模型完整性 in backend/app/models/dimensions.py
- [x] T017 [P] [US1] 验证 TechnicalDimensions 模型完整性 in backend/app/models/dimensions.py
- [x] T018 [P] [US1] 验证 PricingDimensions 模型完整性 in backend/app/models/dimensions.py
- [x] T019 [US1] 验证 BaseCalculator 基础计算方法 in backend/app/services/calculator/base.py
- [x] T020 [US1] 验证 S3StandardCalculator 计算逻辑 in backend/app/services/calculator/s3_standard.py
- [x] T021 [US1] 实现 S3GlacierCalculator 计算逻辑 in backend/app/services/calculator/s3_glacier.py
- [x] T022 [US1] 实现成本计算路由 in backend/app/api/routes/calculate.py
- [x] T023 [US1] 添加参数验证和错误处理 in backend/app/api/routes/calculate.py

### Frontend Implementation

- [x] T024 [P] [US1] 创建三维度参数表单组件 (FunctionalForm + TechnicalForm + PricingForm)
- [x] T025 [P] [US1] 创建费用明细展示组件 (CostBreakdownTable + CostPieChart)
- [x] T026 [P] [US1] 创建成本汇总卡片组件 (ResultDisplay.tsx)
- [x] T027 [US1] 实现计算器页面主体 in frontend/src/pages/Calculator.tsx
- [x] T028 [US1] 实现实时计算 (内联 debounce 500ms)
- [x] T029 [US1] 添加表单验证和错误提示 (fieldConstraints + status error)

### Integration

- [x] T030 [US1] 集成前后端成本计算流程
- [x] T031 [US1] 验证 US1 验收场景 1-3 ✅

**Checkpoint**: ✅ 用户故事 1 完成 - 单一方案成本计算可独立使用

---

## Phase 4: User Story 2 - 多存储方案对比分析 (Priority: P1) 🎯 MVP ✅

**Goal**: 用户一次输入参数，同时查看多方案对比结果和推荐建议

**Status**: ✅ 完成 (2026-01-25) | [Eval Report](../../.claude/evals/phase4-us2-comparison.md)

**Independent Test**: 调用 POST /api/v1/compare 返回 ComparisonResult 含多方案 ✅

### Backend Implementation

- [x] T032 [P] [US2] 创建 ComparisonResult 模型完善 in backend/app/models/results.py
- [x] T033 [US2] 实现多方案对比服务 in backend/app/services/calculator/comparator.py
- [x] T034 [US2] 实现推荐算法 in backend/app/services/calculator/recommender.py
- [x] T035 [US2] 实现对比路由 in backend/app/api/routes/compare.py

### Frontend Implementation

- [x] T036 [P] [US2] 创建方案对比表格组件 (DetailedComparisonTable.tsx)
- [x] T037 [P] [US2] 创建对比柱状图组件 (ComparisonChart.tsx)
- [x] T038 [P] [US2] 创建推荐信息展示 (集成在 DetailedComparisonTable)
- [x] T039 [US2] 集成对比功能到计算器页面 in frontend/src/pages/Calculator.tsx

### Integration

- [x] T040 [US2] 验证 US2 验收场景 1-3 ✅

**Checkpoint**: ✅ 用户故事 2 完成 - 多方案对比可独立使用

**🎯 MVP Complete**: US1 (单一方案计算) + US2 (多方案对比) 核心功能已完成

---

## Phase 5: User Story 3 - 生命周期多阶段策略配置 (Priority: P2) ✅

**Goal**: 用户配置复杂的多阶段生命周期策略并获得成本估算

**Status**: ✅ 完成 (2026-01-25) | [Eval Report](../../.claude/evals/phase5-us3-lifecycle-config.md)

**Independent Test**: 配置 3 阶段策略后计算返回正确的各阶段费用 ✅

### Backend Implementation ✅ (100%)

- [x] T041 [P] [US3] 创建 LifecycleStage 模型 in backend/app/models/dimensions.py (实际路径)
- [x] T042 [P] [US3] 创建 LifecycleTemplate 模型 in backend/app/services/template_loader.py (实际路径)
- [x] T043 [US3] 实现生命周期计算器 in backend/app/services/calculator/lifecycle.py
- [x] T044 [US3] 实现生命周期验证逻辑 in backend/app/models/dimensions.py (LifecyclePolicy)
- [x] T045 [US3] 实现生命周期模板加载 in backend/app/services/template_loader.py
- [x] T046 [US3] 实现生命周期路由 in backend/app/api/routes/templates.py (实际路径)

### Frontend Implementation ✅ (83%)

- [x] T047 [P] [US3] 创建阶段编辑器组件 in frontend/src/components/calculator/StageEditor.tsx (实际路径)
- [x] T048 [P] [US3] 创建阶段时间线组件 (集成在 StorageStrategySelector.tsx 的 renderCompactStageBar)
- [x] T049 [P] [US3] 创建模板选择器组件 (集成在 StorageStrategySelector.tsx)
- [x] T050 [US3] 集成生命周期配置到计算器 in frontend/src/pages/Calculator.tsx

### Integration ✅ (100%)

- [x] T051 [US3] 验证 US3 验收场景 1-4
  - 场景1: 三阶段策略计算 ✅ ($220.77/月)
  - 场景2: 阶段天数调整 ✅ ($174.07/月)
  - 场景3: 配置冲突验证 ✅ (422 错误)
  - 场景4: 模板加载 ✅ (4 个模板)

**Checkpoint**: ✅ 用户故事 3 完成 - 生命周期配置可独立使用

---

## Phase 6: User Story 4 - 预设场景快速加载 (Priority: P2) ✅

**Goal**: 新用户一键加载典型场景参数，快速开始成本估算

**Status**: ✅ 完成 (2026-01-26) | [Eval Report](../../.claude/evals/phase6-us4-preset-scenarios.md)

**Independent Test**: 选择预设场景后表单自动填充正确参数 ✅

### Backend Implementation ✅ (100%)

- [x] T052 [P] [US4] 创建 Scenario 模型 in backend/app/api/routes/scenarios.py (内联定义)
- [x] T053 [US4] 添加 8 个预设场景 JSON 数据 in backend/app/data/scenarios/presets.json
- [x] T054 [US4] 实现场景加载服务 in backend/app/api/routes/scenarios.py (_load_presets)
- [x] T055 [US4] 完善场景路由 in backend/app/api/routes/scenarios.py (list, get, categories)

### Frontend Implementation ✅ (100%)

- [x] T056 [P] [US4] 创建场景选择器组件 in frontend/src/components/calculator/ScenarioSelector.tsx
- [x] T057 [P] [US4] 创建场景卡片组件 (集成在 ScenarioSelector.tsx)
- [x] T058 [US4] 集成场景选择到计算器页面 in frontend/src/components/calculator/InputPanel.tsx

### Integration ✅ (100%)

- [x] T059 [US4] 验证 US4 验收场景 1-2
  - 场景1: 选择预设场景参数自动填充 ✅
  - 场景2: 加载后修改参数仍能计算 ✅

**Checkpoint**: ✅ 用户故事 4 完成 - 预设场景可独立使用

---

## Phase 7: User Story 8 - 成本敏感度分析 (Priority: P2) ✅

**Goal**: 用户通过滑块调节参数，实时查看成本变化曲线

**Status**: ✅ 完成 (2026-01-26) | [Eval Report](../../.claude/evals/phase7-us8-sensitivity-analysis.md)

**Independent Test**: 调节设备数量滑块后成本变化正确显示 ✅

### Backend Implementation ✅ (100%)

- [x] T060 [P] [US8] 创建 SensitivityResult 模型 in backend/app/models/results.py (SensitivityAnalysis)
- [x] T061 [P] [US8] 创建 SensitivityDataPoint 模型 in backend/app/models/results.py (SensitivityItem)
- [x] T062 [US8] 实现敏感度分析算法 in backend/app/services/calculator/sensitivity.py
- [x] T063 [US8] ~~敏感度路由~~ 前端直接复用计算 API（设计优化）

### Frontend Implementation ✅ (100%)

- [x] T064 [P] [US8] 创建参数滑块组件 (集成在 SensitivityAnalysis.tsx)
- [x] T065 [P] [US8] 创建成本变化区间展示 (替代曲线图，更直观)
- [x] T066 [P] [US8] 创建成本变化数值对比组件 (sensitivity-cost-range)
- [x] T067 [US8] 创建敏感度分析面板 in frontend/src/components/calculator/SensitivityAnalysis.tsx
- [x] T068 [US8] 集成敏感度分析到计算器页面 in frontend/src/pages/Calculator.tsx:250

### Integration ✅ (100%)

- [x] T069 [US8] 验证 US8 验收场景 1-3
  - 场景1: 敏感度面板显示 4 个参数滑块 ✅
  - 场景2: 调节设备数量显示成本变化 ✅ (100台→200台 = 2.0x)
  - 场景3: 成本区间正确展示 ✅

**Checkpoint**: ✅ 用户故事 8 完成 - 敏感度分析可独立使用

---

## Phase 8: User Story 5 - 评估结果导出与分享 (Priority: P3) ✅

**Goal**: 用户导出 Excel 报告或生成分享链接

**Status**: ✅ 完成 (2026-01-26) | [Eval Report](../../.claude/evals/phase8-us5-export-share.md)

**Independent Test**: 导出 Excel 文件可正常打开，分享链接可访问 ✅

### Backend Implementation ✅ (100%)

- [x] T070 [P] [US5] 实现 Excel 导出服务 in backend/app/services/excel_export.py
- [x] T071 [P] [US5] 完善分享链接模型 in backend/app/models/share.py
- [x] T072 [US5] 完善分享仓库 in backend/app/db/repositories/shares.py
- [x] T073 [US5] 实现分享服务 (集成在路由中)
- [x] T074 [US5] 实现导出路由 in backend/app/api/routes/export.py
- [x] T075 [US5] 完善分享路由 in backend/app/api/routes/shares.py

### Frontend Implementation ✅ (100%)

- [x] T076 [P] [US5] 创建导出按钮组件 in frontend/src/components/calculator/ExportDialog.tsx
- [x] T077 [P] [US5] 创建分享对话框组件 in frontend/src/components/calculator/ShareDialog.tsx
- [x] T078 [US5] 创建分享查看页面 in frontend/src/pages/SharedView.tsx
- [x] T079 [US5] 集成导出分享到计算器页面 in frontend/src/pages/Calculator.tsx

### Integration ✅ (100%)

- [x] T080 [US5] 验证 US5 验收场景 1-3
  - 场景1: 点击导出按钮下载 Excel 文件 ✅
  - 场景2: 生成分享链接并复制 ✅
  - 场景3: 访问分享链接查看结果 ✅

**Checkpoint**: ✅ 用户故事 5 完成 - 导出分享可独立使用

---

## Phase 9: User Story 6 - 评估历史记录管理 (Priority: P3)

**Goal**: 已登录用户可保存、查看、加载历史评估记录

**Independent Test**: 保存评估后可在历史列表查看并加载

### Backend Implementation

- [ ] T081 [P] [US6] 完善评估记录模型 in backend/app/models/evaluation.py
- [ ] T082 [US6] 完善评估仓库 in backend/app/db/repositories/evaluations.py
- [ ] T083 [US6] 实现评估服务 in backend/app/services/evaluation.py
- [ ] T084 [US6] 完善评估路由 in backend/app/api/routes/evaluations.py

### Frontend Implementation

- [ ] T085 [P] [US6] 创建保存评估对话框 in frontend/src/components/History/SaveDialog.tsx
- [ ] T086 [P] [US6] 创建评估历史列表组件 in frontend/src/components/History/EvaluationList.tsx
- [ ] T087 [P] [US6] 创建评估卡片组件 in frontend/src/components/History/EvaluationCard.tsx
- [ ] T088 [US6] 创建历史记录页面 in frontend/src/pages/HistoryPage.tsx
- [ ] T089 [US6] 集成保存功能到计算器页面 in frontend/src/pages/CalculatorPage.tsx

### Integration

- [ ] T090 [US6] 验证 US6 验收场景 1-3

**Checkpoint**: 用户故事 6 完成 - 历史记录管理可独立使用

---

## Phase 10: User Story 7 - AWS 实时定价数据更新 (Priority: P3)

**Goal**: 管理员可手动刷新 AWS 定价数据

**Independent Test**: 点击刷新后定价数据更新到最新版本

### Backend Implementation

- [ ] T091 [P] [US7] 完善区域定价模型 in backend/app/models/pricing.py
- [ ] T092 [US7] 实现 AWS Pricing API 集成 in backend/app/services/pricing_service.py
- [ ] T093 [US7] 添加定价数据缓存和回退逻辑 in backend/app/services/pricing_service.py
- [ ] T094 [US7] 完善定价路由 in backend/app/api/routes/pricing.py

### Frontend Implementation

- [ ] T095 [P] [US7] 创建区域选择器组件 in frontend/src/components/Admin/RegionSelector.tsx
- [ ] T096 [P] [US7] 创建定价数据表格 in frontend/src/components/Admin/PricingTable.tsx
- [ ] T097 [US7] 创建管理员页面 in frontend/src/pages/AdminPage.tsx

### Integration

- [ ] T098 [US7] 验证 US7 验收场景 1-3

**Checkpoint**: 用户故事 7 完成 - 定价管理可独立使用

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事优化和完善

- [ ] T099 [P] 添加费用构成饼图组件 in frontend/src/components/Charts/CostPieChart.tsx
- [ ] T100 [P] 完善 API 错误处理和用户提示 in frontend/src/services/api.ts
- [ ] T101 [P] 添加加载状态和骨架屏 in frontend/src/components/common/
- [ ] T102 [P] 边缘情况测试：极端参数、并发访问、精度控制
- [ ] T103 运行 quickstart.md 验证流程
- [ ] T104 [P] 代码清理和注释完善
- [ ] T105 [P] 性能优化：前端缓存、计算优化

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → [User Stories in parallel or sequential]
                                          ↓
                           ┌──────────────┼──────────────┐
                           ↓              ↓              ↓
                     Phase 3 (US1)  Phase 4 (US2)  Phase 5+ (US3-8)
                           ↓              ↓              ↓
                           └──────────────┴──────────────┘
                                          ↓
                                   Phase 11 (Polish)
```

### User Story Dependencies

| 用户故事 | 优先级 | 依赖 | 备注 |
|---------|--------|------|------|
| US1 - 单一方案计算 | P1 | Phase 2 | MVP 核心，无其他故事依赖 |
| US2 - 多方案对比 | P1 | Phase 2, US1 | 复用 US1 的计算逻辑 |
| US3 - 生命周期配置 | P2 | Phase 2 | 独立功能 |
| US4 - 预设场景 | P2 | Phase 2 | 独立功能 |
| US8 - 敏感度分析 | P2 | Phase 2, US1 | 基于 US1 的计算结果 |
| US5 - 导出分享 | P3 | Phase 2, US1 | 需要计算结果 |
| US6 - 历史记录 | P3 | Phase 2, 认证 | 需要用户登录 |
| US7 - 定价管理 | P3 | Phase 2, 认证 | 管理员功能 |

### Within Each User Story

1. Models 优先（可并行）
2. Services 依赖 Models
3. Routes 依赖 Services
4. Frontend Components 可并行
5. Integration 最后

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T007, T008, T009 (认证相关) 可并行
- T010, T011, T012 (数据层) 可并行
- T014, T015 (前端基础) 可并行

**Phase 3 (US1)**:
- T016, T017, T018 (Models) 可并行
- T024, T025, T026 (Frontend Components) 可并行

**User Stories 之间**:
- US3, US4 可与 US1/US2 并行开发
- US5, US6, US7 可与 P2 故事并行开发

---

## Parallel Example: User Story 1

```bash
# 并行启动 Backend Models:
Task: "验证 FunctionalDimensions 模型完整性 in backend/app/models/dimensions.py"
Task: "验证 TechnicalDimensions 模型完整性 in backend/app/models/dimensions.py"
Task: "验证 PricingDimensions 模型完整性 in backend/app/models/dimensions.py"

# 并行启动 Frontend Components:
Task: "创建三维度参数表单组件 in frontend/src/components/Calculator/DimensionsForm.tsx"
Task: "创建费用明细展示组件 in frontend/src/components/Calculator/CostBreakdown.tsx"
Task: "创建成本汇总卡片组件 in frontend/src/components/Calculator/CostSummary.tsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational
3. Complete Phase 3: US1 - 单一方案计算
4. Complete Phase 4: US2 - 多方案对比
5. **STOP and VALIDATE**: 核心功能可用
6. Deploy/Demo MVP

### Incremental Delivery

| 阶段 | 交付物 | 价值 |
|------|--------|------|
| MVP | US1 + US2 | 用户可计算和对比成本 |
| v1.1 | + US3, US4 | 高级配置和快速开始 |
| v1.2 | + US8 | 成本优化洞察 |
| v1.3 | + US5, US6, US7 | 协作和管理功能 |

### Parallel Team Strategy

With 2 developers:

1. **Developer A**: US1 → US3 → US5
2. **Developer B**: US2 → US4 → US8 → US6, US7

---

## Notes

- [P] tasks = 不同文件，无依赖
- [Story] label 映射到 spec.md 中的用户故事
- 每个用户故事应可独立完成和测试
- 每个任务或逻辑组完成后提交
- 任何 Checkpoint 处可停止验证故事独立性
- 避免：模糊任务、同文件冲突、破坏独立性的跨故事依赖
