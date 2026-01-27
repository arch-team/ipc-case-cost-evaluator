# Implementation Plan: AWS CDK Serverless 基础设施部署

**Branch**: `003-aws-cdk-infra` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-aws-cdk-infra/spec.md`

## Summary

为 IPC Cost Evaluator 项目创建 AWS CDK TypeScript 基础设施即代码项目，实现前后端 Serverless 部署。采用 Lambda 容器镜像部署 FastAPI 后端，S3 + CloudFront 部署 React 前端，统一 CloudFront 入口代理 API 请求。支持多环境隔离、一键部署/销毁，以及按环境区分的数据保留策略。

## Technical Context

**Language/Version**: TypeScript 5.x (CDK) + Python 3.11 (Lambda Runtime)
**Primary Dependencies**: aws-cdk-lib ^2.120.0, constructs ^10.3.0, Mangum (FastAPI Lambda adapter)
**Storage**: DynamoDB (按需计费模式)
**Testing**: Jest (CDK), pytest (Lambda)
**Target Platform**: AWS (us-east-1 默认区域)
**Project Type**: IaC 子项目 (infra/ 子目录)
**Performance Goals**: 冷启动 <5s, 页面加载 <3s, 首次部署 <15min
**Constraints**: Lambda 30s 超时, 1024MB 内存, HTTP API
**Scale/Scope**: 支持 3+ 独立环境实例

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 合规状态 | 说明 |
|------|----------|------|
| I. 三维度模型设计 | ✅ N/A | IaC 项目不涉及成本计算逻辑 |
| II. 计算器继承体系 | ✅ N/A | IaC 项目不涉及计算器 |
| III. Pydantic 数据模型优先 | ✅ 兼容 | Lambda 复用现有后端代码 |
| IV. 测试驱动验证 | ✅ 需实现 | CDK 测试覆盖栈定义 |
| V. 定价数据外部化 | ✅ 兼容 | 环境配置外部化，支持多区域 |
| API 设计标准 | ✅ 兼容 | 继承现有 /api/v1 前缀 |
| 代码组织标准 | ✅ 扩展 | 新增 infra/ 子目录 |
| 命名规范 | ✅ 遵循 | 中文注释，统一命名前缀 |

**Constitution 后检查**: Phase 1 设计完成，无违规项。

## Project Structure

### Documentation (this feature)

```text
specs/003-aws-cdk-infra/
├── plan.md              # 本文件
├── spec.md              # 功能规范
├── research.md          # 技术研究
├── data-model.md        # 数据模型
├── quickstart.md        # 快速开始指南
├── contracts/           # 接口合约
│   └── cdk-commands.md  # CDK 命令接口
└── tasks.md             # 任务列表 (/speckit.tasks 生成)
```

### Source Code (repository root)

```text
infra/                           # CDK 项目根目录
├── bin/
│   └── app.ts                   # CDK 应用入口
├── lib/
│   ├── stacks/                  # CDK 栈定义
│   │   ├── database-stack.ts    # DynamoDB 表
│   │   ├── backend-stack.ts     # Lambda + API Gateway
│   │   └── frontend-stack.ts    # S3 + CloudFront
│   ├── constructs/              # 可复用构造
│   │   ├── fastapi-lambda.ts    # FastAPI Lambda 构造
│   │   ├── static-website.ts    # 静态网站构造
│   │   └── dynamodb-tables.ts   # DynamoDB 表构造
│   └── config/
│       └── environments.ts      # 环境配置
├── test/                        # CDK 测试
│   └── stacks.test.ts
├── cdk.json                     # CDK 配置
├── tsconfig.json
└── package.json

backend/                         # 现有后端（需新增）
├── Dockerfile.lambda            # Lambda 容器镜像构建
└── lambda_handler.py            # Mangum 适配器入口
```

**Structure Decision**: 采用独立 `infra/` 子目录存放 CDK 代码，与现有 `backend/`、`frontend/` 平级。CDK 项目使用 TypeScript，利用类型安全特性。后端需新增 Lambda 专用 Dockerfile 和处理器入口。

## Architecture Overview

```
                          ┌─────────────────────────────────────┐
                          │         CloudFront Distribution     │
                          │  (统一入口, HTTPS, 全球 CDN)         │
                          └───────────┬───────────┬─────────────┘
                                      │           │
                        /api/*        │           │  /*
                                      ▼           ▼
                 ┌────────────────────────┐ ┌─────────────────┐
                 │  API Gateway HTTP API  │ │   S3 Bucket     │
                 │  (Lambda 集成)          │ │   (私有, OAC)   │
                 └───────────┬────────────┘ └─────────────────┘
                             │                     ▲
                             ▼                     │
                 ┌────────────────────────┐        │
                 │  Lambda (容器镜像)      │        │
                 │  FastAPI + Mangum      │        │
                 └───────────┬────────────┘   前端构建产物
                             │
                             ▼
                 ┌────────────────────────┐
                 │    DynamoDB Tables     │
                 │  (users, evaluations,  │
                 │   shares - 按需计费)   │
                 └────────────────────────┘
```

## Key Implementation Decisions

| 决策项 | 选择 | 理由 |
|--------|------|------|
| Lambda 打包 | 容器镜像 | 支持大依赖包，复用现有 Dockerfile |
| API Gateway | HTTP API | 成本低 70%，延迟低，功能足够 |
| FastAPI 适配器 | Mangum | 最成熟稳定的 ASGI 适配器 |
| 前端路由 | CloudFront 函数 | 比 Lambda@Edge 便宜 6 倍 |
| DynamoDB 计费 | 按需 (On-Demand) | 流量不可预测，无需预估容量 |
| 环境配置 | TypeScript 对象 | 类型安全，集中管理 |

## Risk & Mitigation

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Lambda 冷启动慢 | 首次请求延迟高 | ARM64 架构 + 1024MB 内存优化 |
| CloudFront 更新慢 | 部署后验证延迟 | 使用 `cdk diff` 预览变更 |
| 依赖包过大 | 构建时间长 | Docker 多阶段构建，缓存依赖层 |
| 跨栈依赖 | 部署顺序复杂 | CDK 自动处理依赖，使用 `--all` |

## Phase 0 Outputs

- [x] research.md - 技术研究完成

## Phase 1 Outputs

- [x] data-model.md - CDK 资源实体模型
- [x] contracts/cdk-commands.md - CDK 命令接口合约
- [x] quickstart.md - 快速开始指南
- [x] Agent context update - CLAUDE.md 已更新

## Next Steps

1. 执行 `/speckit.tasks` 生成详细任务列表
2. 按任务顺序实现 CDK 代码
3. 执行部署测试验证功能
