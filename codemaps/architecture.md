# IPC Cost Evaluator - 整体架构

> **Freshness**: 2026-01-26T14:30:00Z
> **版本**: 1.1.0

## 项目概述

IPC Case Cost Evaluator 是一个 AWS S3 云存储成本评估系统，用于计算和对比 IPC（网络摄像头）视频监控数据的存储成本。

| 属性 | 值 |
|------|-----|
| 后端框架 | FastAPI (Python 3.11+) |
| 前端框架 | React + TypeScript 5.9+ |
| 数据库 | AWS DynamoDB + 本地 JSON |
| 部署 | Docker 容器化 |

---

## 三维度成本计算模型

```
┌─────────────────────────────────────────────────────────────────┐
│                    三维度成本计算模型                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Functional   │    │ Technical    │    │ Pricing      │      │
│  │ Dimensions   │    │ Dimensions   │    │ Dimensions   │      │
│  │ (功能维度)    │    │ (技术维度)    │    │ (价格维度)   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        │                    │                    │              │
│   设备数/录像模式      存储类型/生命周期     区域/折扣/计费模式    │
│        └────────────────────┼────────────────────┘              │
│                             ▼                                   │
│                    ┌──────────────────┐                         │
│                    │ Calculator Engine│                         │
│                    │ ├─ BaseCalculator│                         │
│                    │ ├─ S3Standard    │                         │
│                    │ ├─ S3Glacier     │                         │
│                    │ └─ Lifecycle     │                         │
│                    └──────────────────┘                         │
│                             │                                   │
│                             ▼                                   │
│                    ┌──────────────────┐                         │
│                    │ CostSummary      │                         │
│                    │ ├─ CostBreakdown │                         │
│                    │ └─ Metrics       │                         │
│                    └──────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   Home     │ │ Calculator │ │Evaluations │ │  Settings  │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                         │                                       │
│              ┌──────────┴──────────┐                           │
│              │   API Client Layer  │                           │
│              └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Routes Layer                      │   │
│  │  /calculate │ /compare │ /scenarios │ /pricing │ ...   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Services Layer                         │   │
│  │  Calculator │ Comparator │ Recommender │ Pricing        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Models Layer                          │   │
│  │  Dimensions │ Results │ Pricing │ Enums │ Share         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Database Layer                          │   │
│  │  DynamoDB Client │ Repositories │ Local Storage          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│  AWS DynamoDB    │            │  Local JSON      │
│  (评估/分享记录)  │            │  (AWS 定价数据)   │
└──────────────────┘            └──────────────────┘
```

---

## 核心数据流

### 成本计算流程

```
用户输入 → CostCalculationInput → 计算器选择 → 费用计算 → CostSummary → 前端展示
```

详细流程：

1. **输入收集**: 前端收集三类维度参数
2. **API 调用**: POST `/api/v1/calculate`
3. **计算器选择**:
   - `lifecycle_policy.enabled` → LifecycleCalculator
   - `storage_class == GLACIER_IR` → S3GlacierCalculator
   - 默认 → S3StandardCalculator
4. **费用计算**: 存储 + PUT + GET + 检索 + 传输 + 生命周期
5. **结果返回**: CostSummary (月度/年度成本 + 费用明细)

---

## 模块依赖关系

```
main.py
└── api/routes/
    ├── calculate.py ──────┐
    ├── compare.py ────────┤
    ├── scenarios.py ──────┤
    └── ...                │
                           ▼
                services/calculator/
                ├── base.py ◄─────────┐
                ├── s3_standard.py ───┤ (继承)
                ├── s3_glacier.py ────┤
                ├── lifecycle.py ─────┘
                ├── comparator.py
                └── recommender.py
                           │
                           ▼
                    models/
                    ├── dimensions.py
                    ├── enums.py
                    ├── pricing.py
                    └── results.py
                           │
                           ▼
                      data/
                      └── aws_pricing/*.json
```

---

## 技术栈详情

### 后端
- **框架**: FastAPI 0.109+
- **数据验证**: Pydantic v2
- **数据库**: boto3 (DynamoDB)
- **测试**: pytest
- **导出**: openpyxl (Excel)

### 前端
- **框架**: React 18+
- **语言**: TypeScript 5.9+
- **UI 库**: Ant Design
- **图表**: ECharts / Ant Design Charts
- **状态管理**: React Context / Hooks
- **路由**: React Router

### 基础设施
- **容器化**: Docker + docker-compose
- **数据库**: AWS DynamoDB
- **定价数据**: 本地 JSON 文件

---

## 关键文件索引

| 类别 | 文件 | 用途 |
|------|------|------|
| 入口 | `backend/app/main.py` | FastAPI 应用入口 |
| 配置 | `backend/app/core/config.py` | 应用配置 |
| 计算 | `backend/app/services/calculator/base.py` | 基础计算器 |
| 模型 | `backend/app/models/dimensions.py` | 三类维度定义 |
| 结果 | `backend/app/models/results.py` | 计算结果模型 |
| 定价 | `backend/app/data/aws_pricing/` | AWS 定价数据 |
| 前端 | `frontend/src/App.tsx` | React 应用入口 |
| 页面 | `frontend/src/pages/Calculator.tsx` | 主要计算页面 |
