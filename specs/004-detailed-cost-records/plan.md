# Implementation Plan: 详细成本核算记录

**Branch**: `004-detailed-cost-records` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-detailed-cost-records/spec.md`

## Summary

实现详细成本核算记录功能，包含两个核心能力：
1. **实时预览**：用户填写参数时实时显示详细核算信息（防抖500ms）
2. **记录保存**：将核算结果持久化到 DynamoDB，支持列表管理和详情查看

技术方案复用现有 `DetailedCostBreakdown` 模型和 `LifecycleCalculator.calculate_with_details()` 方法，新增 `CalculationRecord` 实体和独立的 API/页面。

## Technical Context

**Language/Version**: Python 3.11+ (后端), TypeScript 5.9+ (前端)
**Primary Dependencies**: FastAPI, Pydantic v2, React, Ant Design
**Storage**: DynamoDB (生产), LocalStorage (开发) - 新增 `ipc_cost_calculation_records` 表
**Testing**: pytest (后端), Playwright (E2E)
**Target Platform**: Web 应用 (AWS Lambda + CloudFront)
**Project Type**: Web 应用 (frontend + backend)
**Performance Goals**: 实时计算响应 <500ms, 详情页加载 <1s, 记录生成 <3s
**Constraints**: DynamoDB 单项 400KB 限制, 单用户最多 1000 条记录
**Scale/Scope**: 现有用户基础，预期每用户 10-100 条记录

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 合规状态 | 说明 |
|------|---------|------|
| I. 三维度模型设计 | ✅ PASS | 输入参数快照按三维度组织 (Functional/Technical/Pricing) |
| II. 计算器继承体系 | ✅ PASS | 复用现有 `LifecycleCalculator.calculate_with_details()` |
| III. Pydantic 优先 | ✅ PASS | 新增模型均使用 Pydantic，包含验证规则 |
| IV. 测试驱动验证 | ✅ PASS | 计划包含单元测试和 E2E 测试 |
| V. 定价数据外部化 | ✅ PASS | 定价快照从 `PricingService` 获取，不硬编码 |

## Project Structure

### Documentation (this feature)

```text
specs/004-detailed-cost-records/
├── spec.md              # 功能规格说明
├── plan.md              # 本文件 - 实现计划
├── research.md          # 技术研究
├── data-model.md        # 数据模型设计
├── quickstart.md        # 快速开始指南
├── contracts/           # API 契约
│   └── openapi.yaml     # OpenAPI 规范
└── tasks.md             # 任务分解 (由 /speckit.tasks 生成)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   └── calculation_records.py    # [新增] 核算记录数据模型
│   ├── services/
│   │   └── calculation_record_generator.py  # [新增] 核算记录生成器
│   ├── api/routes/
│   │   └── calculation_records.py    # [新增] API 路由
│   ├── db/repositories/
│   │   └── calculation_records.py    # [新增] 数据访问层
│   └── core/
│       └── config.py                 # [修改] 添加表名配置
└── tests/
    └── test_calculation_records.py   # [新增] 单元测试

frontend/
├── src/
│   ├── types/
│   │   └── calculationRecords.ts     # [新增] 类型定义
│   ├── api/
│   │   └── calculationRecords.ts     # [新增] API 客户端
│   ├── pages/
│   │   ├── CalculationRecords.tsx    # [新增] 列表页面
│   │   └── CalculationRecordDetail.tsx # [新增] 详情页面
│   ├── components/
│   │   └── calculator/
│   │       ├── DetailedCostPreview.tsx # [新增] 实时预览组件
│   │       └── SaveRecordDialog.tsx    # [新增] 保存对话框
│   └── App.tsx                        # [修改] 添加路由
└── tests/
    └── e2e/
        └── calculation-records.spec.ts # [新增] E2E 测试

infra/
└── lib/constructs/
    └── dynamodb-tables.ts             # [修改] 添加新表
```

**Structure Decision**: 遵循现有 Web 应用结构，新增文件与现有 evaluations 功能保持平行组织。

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| 原则 | 合规状态 | 设计验证 |
|------|---------|---------|
| I. 三维度模型设计 | ✅ PASS | `InputParameterSnapshot` 按 Functional/Technical/Pricing 三维度组织 |
| II. 计算器继承体系 | ✅ PASS | 复用 `LifecycleCalculator.calculate_with_details()`，为 `S3StandardCalculator` 添加同名方法 |
| III. Pydantic 优先 | ✅ PASS | 所有新模型使用 Pydantic，包含 `Field` 验证和 `@computed_field` |
| IV. 测试驱动验证 | ✅ PASS | 计划包含单元测试 (`test_calculation_records.py`) 和 E2E 测试 |
| V. 定价数据外部化 | ✅ PASS | `PricingSnapshot` 从 `PricingService` 获取，JSON 序列化存储 |

## Complexity Tracking

> 无 Constitution 违规需要解释。

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 新增实体数量 | 5 个 | 必要的数据建模，与规格说明一致 |
| 新增 API 端点 | 5 个 | CRD 操作 + 实时计算 + 默认值 |
| 前端页面 | 2 页 | 列表 + 详情，复用现有组件模式 |

## Phase 0 & 1 Artifacts

| 产出物 | 状态 | 路径 |
|--------|------|------|
| research.md | ✅ 完成 | `specs/004-detailed-cost-records/research.md` |
| data-model.md | ✅ 完成 | `specs/004-detailed-cost-records/data-model.md` |
| openapi.yaml | ✅ 完成 | `specs/004-detailed-cost-records/contracts/openapi.yaml` |
| quickstart.md | ✅ 完成 | `specs/004-detailed-cost-records/quickstart.md` |
| agent context | ✅ 更新 | `CLAUDE.md` 已更新 |
