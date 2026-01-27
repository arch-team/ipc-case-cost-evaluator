# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言要求
**所有对话、代码注释、文档和 Git 提交信息必须使用中文。**

## 项目概述

IPC Case Cost Evaluator - AWS S3 云存储成本评估系统，用于计算和对比 IPC（网络摄像头）视频监控数据的存储成本。全栈 Web 应用，支持三维度成本建模、多方案对比、灵敏度分析和评估管理。

## 开发命令

### 后端 (FastAPI + Python 3.11+)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# 运行开发服务器
uvicorn app.main:app --reload

# 运行测试
pytest tests/ -v
pytest tests/test_s3_standard.py -v                    # 单个测试文件
pytest tests/test_s3_standard.py::test_basic_cost -v   # 单个测试函数
pytest tests/ --cov=app --cov-report=html              # 测试覆盖率
```

### 前端 (React + TypeScript 5.9+)

```bash
cd frontend
npm install

npm run dev          # 启动 Vite 开发服务器 (localhost:5173)
npm run build        # 构建生产版本
npm run lint         # ESLint 检查

# E2E 测试 (Playwright)
npm run test:e2e           # 运行 E2E 测试
npm run test:e2e:ui        # UI 模式
npm run test:e2e:headed    # 有头模式
npm run test:e2e:debug     # 调试模式
```

### Docker 编排

```bash
docker-compose up -d                           # 生产环境
docker-compose -f docker-compose.dev.yml up    # 开发环境 (热重载)
docker-compose logs -f                         # 查看日志
docker-compose down                            # 停止服务

# 访问地址
# 后端 API: http://localhost:8000
# 前端: http://localhost (生产) / http://localhost:5173 (开发)
# API 文档: http://localhost:8000/docs
```

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    三维度成本计算模型                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Functional   │    │ Technical    │    │ Pricing      │      │
│  │ Dimensions   │    │ Dimensions   │    │ Dimensions   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        │                    │                    │              │
│        └────────────────────┼────────────────────┘              │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Calculator Engine (7 个计算器)               │  │
│  │  BaseCalculator → S3StandardCalculator                   │  │
│  │                 → S3GlacierCalculator                    │  │
│  │                 → LifecycleCalculator                    │  │
│  │  CostComparator / SmartRecommender / SensitivityAnalyzer │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│                    ┌──────────────────┐                         │
│                    │ CostSummary      │                         │
│                    │ - CostBreakdown  │                         │
│                    │ - Metrics        │                         │
│                    │ - Recommendations│                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 三类维度

- **FunctionalDimensions** (`backend/app/models/dimensions.py`) - 功能维度：设备数、录像模式、视频质量、回看比例、保留天数、分片策略
- **TechnicalDimensions** - 技术维度：存储类型 (Standard/Glacier IR)、生命周期策略
- **PricingDimensions** - 价格维度：区域、折扣比例、计费模式

### 后端核心模块

- **`backend/app/services/calculator/`** - 成本计算引擎
  - `base.py` - 基础计算器，通用的数据量和请求数计算方法
  - `s3_standard.py` - S3 Standard 存储类型计算器
  - `s3_glacier.py` - S3 Glacier IR 计算器
  - `lifecycle.py` - 生命周期转换计算器 (多阶段成本)
  - `comparator.py` - 多方案成本对比引擎
  - `recommender.py` - 智能推荐引擎
  - `sensitivity.py` - 灵敏度分析器

- **`backend/app/models/`** - 数据模型 (Pydantic v2)
  - `dimensions.py` - 三类维度定义和 `CostCalculationInput`
  - `enums.py` - 枚举：`RecordingMode`, `VideoQuality`, `SegmentStrategy`, `StorageClass`
  - `pricing.py` - AWS 定价模型和 `PricingLoader`
  - `results.py` - 计算结果：`CostBreakdown`, `CostSummary`, `ComparisonResult`

- **`backend/app/api/routes/`** - API 路由 (9 个模块)
  - `calculate.py` / `compare.py` - 核心计算端点
  - `evaluations.py` / `shares.py` - 评估和分享管理
  - `auth.py` - JWT 认证

- **`backend/app/db/`** - 数据访问层
  - 支持 DynamoDB (生产) 和本地存储 (开发)
  - `repositories/` - 评估和分享数据仓库

### 前端核心模块

- **`frontend/src/pages/`** - 5 个页面组件
  - `Calculator.tsx` - 核心成本计算页面
  - `Evaluations.tsx` - 评估历史管理
  - `SharedView.tsx` - 分享链接查看

- **`frontend/src/components/calculator/`** - 14+ 个计算器组件
  - `InputPanel.tsx` / `FunctionalForm.tsx` / `TechnicalForm.tsx` - 输入表单
  - `ResultDisplay.tsx` / `CostBreakdownTable.tsx` / `CostPieChart.tsx` - 结果展示
  - `SensitivityAnalysis.tsx` - 灵敏度分析热力图
  - `MultiSchemePanel.tsx` - 多方案对比面板

### 数据流

```
前端 (React) → CostCalculationInput → POST /api/v1/calculate
    ↓
后端 (FastAPI) → Pydantic 验证 → 计算器选择 → 成本计算
    ↓
CostSummary (JSON) → 前端渲染 (表格/图表/推荐)
```

### 计算器选择逻辑

```python
if lifecycle_policy.enabled:
    使用 LifecycleCalculator (多阶段成本)
elif storage_class == GLACIER_IR:
    使用 S3GlacierCalculator
else:
    使用 S3StandardCalculator (默认)
```

### 成本计算公式

```python
# 每日数据量 (事件触发模式)
daily_data_kb = device_count * data_rate_kb * events_per_day * event_duration_sec

# 月度 PUT 请求数
monthly_puts = device_count * (daily_recording_seconds / segment_seconds) * 30

# 月度 GET 请求数
monthly_gets = monthly_puts * access_pattern

# 总成本
total = storage_cost + put_cost + get_cost + retrieval_cost + transfer_cost + lifecycle_cost
```

### AWS 定价参考 (ap-northeast-1)

| 项目 | S3 Standard | S3 Glacier IR |
|------|-------------|---------------|
| 存储 | $0.025/GB | $0.004/GB |
| PUT 请求 | $0.0047/千次 | $0.02/千次 |
| GET 请求 | $0.00037/千次 | $0.01/千次 |
| GET 检索 | - | $0.03/GB |
| 生命周期转换 | - | $0.02/千次 |
| 数据传输出站 | $0.114/GB (前10TB) | 同左 |

## 存储配置

项目支持两种存储后端，通过 `STORAGE_TYPE` 环境变量切换：
- `local` - 本地文件存储 (开发默认)
- `dynamodb` - AWS DynamoDB (生产推荐)

AWS 定价数据存储在 `backend/app/data/aws_pricing/` 目录下的 JSON 文件中。

## 相关文档

- [设计文档](docs/plans/2025-01-24-ipc-cost-evaluator-design.md)
- [实现计划](docs/plans/2025-01-24-implementation-plan.md)
- [代码地图](codemaps/) - 详细架构文档

## Active Technologies
- Python 3.11+ (Backend), TypeScript 5.9+ (Frontend) + FastAPI, Pydantic, python-jose[cryptography], passlib[bcrypt], React 19, Ant Design 6, React Query 5 (002-user-auth-roles)
- Amazon DynamoDB (users, evaluations, shares 表), 本地 JSON (AWS 定价数据) (002-user-auth-roles)
- TypeScript 5.x (CDK) + Python 3.11 (Lambda Runtime) + aws-cdk-lib ^2.120.0, constructs ^10.3.0, Mangum (FastAPI Lambda adapter) (003-aws-cdk-infra)
- DynamoDB (按需计费模式) (003-aws-cdk-infra)

## Recent Changes
- 002-user-auth-roles: Added Python 3.11+ (Backend), TypeScript 5.9+ (Frontend) + FastAPI, Pydantic, python-jose[cryptography], passlib[bcrypt], React 19, Ant Design 6, React Query 5
