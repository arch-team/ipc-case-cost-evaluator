# Tasks: AWS CDK Serverless 基础设施部署

**Input**: Design documents from `/specs/003-aws-cdk-infra/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: 未明确要求测试任务，本任务列表仅包含实现任务。

**Organization**: 任务按用户故事分组，支持独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事 (US1, US2, US3, US4, US5)
- 包含确切文件路径

## Path Conventions

本项目使用以下路径结构：
- **CDK 项目**: `infra/`
- **后端 Lambda**: `backend/`（新增 Lambda 相关文件）

---

## Phase 1: Setup (项目初始化)

**Purpose**: 创建 CDK 项目基础结构

- [ ] T001 创建 CDK 项目目录结构 `infra/`
- [ ] T002 初始化 CDK TypeScript 项目，配置 `infra/package.json`
- [ ] T003 [P] 配置 TypeScript 编译选项 `infra/tsconfig.json`
- [ ] T004 [P] 配置 CDK 应用设置 `infra/cdk.json`
- [ ] T005 [P] 添加 `.gitignore` 规则忽略 CDK 构建产物 `infra/.gitignore`

---

## Phase 2: Foundational (基础设施核心组件)

**Purpose**: 实现所有用户故事共享的核心组件

**⚠️ CRITICAL**: 所有用户故事任务必须在此阶段完成后才能开始

### 环境配置

- [ ] T006 创建环境配置接口和默认值 `infra/lib/config/environments.ts`

### Lambda 适配器

- [ ] T007 创建 Lambda Dockerfile `backend/Dockerfile.lambda`
- [ ] T008 创建 Mangum 适配器入口 `backend/lambda_handler.py`
- [ ] T009 更新 backend requirements，添加 mangum 依赖 `backend/requirements.txt`

### CDK 构造组件

- [ ] T010 [P] 创建 DynamoDB 表构造 `infra/lib/constructs/dynamodb-tables.ts`
- [ ] T011 [P] 创建 FastAPI Lambda 构造 `infra/lib/constructs/fastapi-lambda.ts`
- [ ] T012 [P] 创建静态网站构造 `infra/lib/constructs/static-website.ts`

### CDK 栈定义

- [ ] T013 创建 DatabaseStack `infra/lib/stacks/database-stack.ts`
- [ ] T014 创建 BackendStack `infra/lib/stacks/backend-stack.ts`（依赖 T013）
- [ ] T015 创建 FrontendStack `infra/lib/stacks/frontend-stack.ts`（依赖 T014）

### CDK 应用入口

- [ ] T016 创建 CDK 应用入口 `infra/bin/app.ts`

**Checkpoint**: 基础设施组件就绪，可开始用户故事实现

---

## Phase 3: User Story 1 - 一键部署完整应用栈 (Priority: P1) 🎯 MVP

**Goal**: 通过单一命令将 IPC Cost Evaluator 完整部署到 AWS 云环境

**Independent Test**: 执行 `npm run deploy:dev` 后，访问输出的 URL 能正常加载应用并调用 API

### Implementation for User Story 1

- [ ] T017 [US1] 配置 DynamoDB 表（users, evaluations, shares）按需计费模式 `infra/lib/constructs/dynamodb-tables.ts`
- [ ] T018 [US1] 配置 Lambda 容器镜像构建（ARM64, 1024MB, 30s 超时）`infra/lib/constructs/fastapi-lambda.ts`
- [ ] T019 [US1] 配置 API Gateway HTTP API 与 Lambda 集成 `infra/lib/constructs/fastapi-lambda.ts`
- [ ] T020 [US1] 配置 S3 存储桶私有访问策略 `infra/lib/constructs/static-website.ts`
- [ ] T021 [US1] 配置 CloudFront 分发与 SPA 路由函数 `infra/lib/constructs/static-website.ts`
- [ ] T022 [US1] 配置 CloudFront 多源站（S3 + API Gateway）路径行为 `infra/lib/stacks/frontend-stack.ts`
- [ ] T023 [US1] 配置 Lambda 执行角色和 DynamoDB 访问权限 `infra/lib/stacks/backend-stack.ts`
- [ ] T024 [US1] 配置 CDK Stack Outputs（FrontendUrl, ApiUrl, TableNames）`infra/lib/stacks/*.ts`
- [ ] T025 [US1] 添加 npm scripts 快捷命令 `infra/package.json`

**Checkpoint**: User Story 1 完成，可执行 `npm run deploy:dev` 完整部署

---

## Phase 4: User Story 2 - 多环境支持部署 (Priority: P2)

**Goal**: 支持 dev/staging/prod 多环境独立部署

**Independent Test**: 使用不同环境标识执行部署，验证资源相互独立

### Implementation for User Story 2

- [ ] T026 [US2] 实现环境配置切换逻辑（dev/staging/prod）`infra/lib/config/environments.ts`
- [ ] T027 [US2] 配置环境感知的资源命名前缀 `infra/lib/constructs/*.ts`
- [ ] T028 [US2] 配置 CDK Context 读取环境参数 `infra/bin/app.ts`
- [ ] T029 [US2] 配置栈命名规范 IPCCostEvaluator-{Stack}-{Env} `infra/bin/app.ts`
- [ ] T030 [US2] 配置环境特定的 CORS 允许源 `infra/lib/config/environments.ts`
- [ ] T031 [US2] 添加环境特定的 npm scripts `infra/package.json`

**Checkpoint**: User Story 2 完成，可部署多个独立环境

---

## Phase 5: User Story 3 - 资源栈销毁与清理 (Priority: P2)

**Goal**: 支持完整销毁资源栈，按环境区分数据保留策略

**Independent Test**: 执行销毁命令后，验证资源正确删除（dev 删除数据，prod 保留）

### Implementation for User Story 3

- [ ] T032 [US3] 配置 DynamoDB RemovalPolicy 按环境区分 `infra/lib/constructs/dynamodb-tables.ts`
- [ ] T033 [US3] 配置 S3 存储桶 autoDeleteObjects 按环境区分 `infra/lib/constructs/static-website.ts`
- [ ] T034 [US3] 配置 prod 环境 DynamoDB PITR（时间点恢复）`infra/lib/constructs/dynamodb-tables.ts`
- [ ] T035 [US3] 添加 destroy npm scripts `infra/package.json`

**Checkpoint**: User Story 3 完成，可安全销毁资源栈

---

## Phase 6: User Story 4 - 部署状态查看 (Priority: P3)

**Goal**: 查看已部署资源栈的状态和输出信息

**Independent Test**: 执行 `cdk list` 和 `cdk diff` 命令，查看栈状态

### Implementation for User Story 4

- [ ] T036 [US4] 添加 diff npm scripts 查看变更 `infra/package.json`
- [ ] T037 [US4] 配置 CfnOutput 导出关键信息 `infra/lib/stacks/*.ts`

**Checkpoint**: User Story 4 完成，可查看部署状态

---

## Phase 7: User Story 5 - 增量更新部署 (Priority: P3)

**Goal**: 支持增量更新，仅更新变化的资源

**Independent Test**: 修改配置后重新部署，验证仅更新变化资源

### Implementation for User Story 5

- [ ] T038 [US5] 验证 CDK 增量更新行为（内置功能）`infra/`
- [ ] T039 [US5] 配置 synth npm script 生成 CloudFormation 模板 `infra/package.json`

**Checkpoint**: User Story 5 完成，支持增量更新

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 完善文档和最终验证

- [ ] T040 [P] 更新 quickstart.md 确保步骤准确 `specs/003-aws-cdk-infra/quickstart.md`
- [ ] T041 [P] 添加 infra/README.md 使用说明 `infra/README.md`
- [ ] T042 验证完整部署流程（端到端测试）
- [ ] T043 验证多环境部署隔离性
- [ ] T044 验证销毁流程和数据保留策略
- [ ] T045 代码清理和中文注释完善

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ────────────────────────────────────────┐
                                                        │
Phase 2 (Foundational) ─────────────────────────────────┤
                                                        │
     ┌──────────────────────────────────────────────────┘
     │
     ├── Phase 3 (US1: 一键部署) 🎯 MVP
     │
     ├── Phase 4 (US2: 多环境) ← 依赖 US1 基础
     │
     ├── Phase 5 (US3: 销毁清理) ← 依赖 US1 基础
     │
     ├── Phase 6 (US4: 状态查看) ← 依赖 US1 基础
     │
     └── Phase 7 (US5: 增量更新) ← 依赖 US1 基础
                    │
                    ▼
          Phase 8 (Polish)
```

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后可开始，无其他依赖 - **MVP 核心**
- **User Story 2 (P2)**: 依赖 US1 的基础栈定义，可在 US1 完成后并行
- **User Story 3 (P2)**: 依赖 US1 的基础栈定义，可在 US1 完成后并行
- **User Story 4 (P3)**: 依赖 US1 的基础栈定义，可在 US1 完成后并行
- **User Story 5 (P3)**: 依赖 US1 的基础栈定义，主要是验证任务

### Within Each User Story

- 构造组件优先于栈定义
- 配置优先于实现
- 核心功能优先于辅助功能

### Parallel Opportunities

**Phase 1 (Setup)**:
```bash
# 可并行
Task T003: "配置 TypeScript 编译选项 infra/tsconfig.json"
Task T004: "配置 CDK 应用设置 infra/cdk.json"
Task T005: "添加 .gitignore 规则 infra/.gitignore"
```

**Phase 2 (Foundational)**:
```bash
# 构造组件可并行
Task T010: "创建 DynamoDB 表构造 infra/lib/constructs/dynamodb-tables.ts"
Task T011: "创建 FastAPI Lambda 构造 infra/lib/constructs/fastapi-lambda.ts"
Task T012: "创建静态网站构造 infra/lib/constructs/static-website.ts"
```

**Phase 8 (Polish)**:
```bash
# 文档更新可并行
Task T040: "更新 quickstart.md"
Task T041: "添加 infra/README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✅
2. Complete Phase 2: Foundational ✅
3. Complete Phase 3: User Story 1 ✅
4. **STOP and VALIDATE**: 执行 `npm run deploy:dev` 验证完整部署
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. User Story 1 → 测试部署 → **MVP 交付!**
3. User Story 2 → 测试多环境 → 增强交付
4. User Story 3 → 测试销毁 → 完整生命周期
5. User Story 4 + 5 → 运维支持 → 完整功能

### Sequential Execution (单人)

由于 CDK 栈之间存在依赖关系，建议按以下顺序执行：

1. T001-T005 (Setup)
2. T006-T016 (Foundational)
3. T017-T025 (US1 - MVP)
4. T026-T031 (US2)
5. T032-T035 (US3)
6. T036-T037 (US4)
7. T038-T039 (US5)
8. T040-T045 (Polish)

---

## Notes

- [P] 任务 = 不同文件，无依赖，可并行
- [Story] 标签关联到具体用户故事
- 每个用户故事应独立可完成和可测试
- 提交频率：每个任务或逻辑分组后提交
- MVP 目标：完成 Phase 1-3 即可交付核心价值
- 中文注释：所有代码注释使用中文
