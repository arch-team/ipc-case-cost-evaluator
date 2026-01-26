# IPC Cost Evaluator - 后端结构

> **Freshness**: 2026-01-26T00:00:00Z
> **版本**: 1.0.0

## 目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI 应用入口
│   │
│   ├── core/
│   │   └── config.py                # 应用配置
│   │
│   ├── models/                      # Pydantic 数据模型
│   │   ├── dimensions.py            # 三类维度定义
│   │   ├── enums.py                 # 枚举类型
│   │   ├── pricing.py               # AWS 定价模型
│   │   ├── results.py               # 计算结果模型
│   │   └── share.py                 # 分享模型
│   │
│   ├── api/routes/                  # API 路由
│   │   ├── calculate.py             # 成本计算
│   │   ├── compare.py               # 方案对比
│   │   ├── scenarios.py             # 预设场景
│   │   ├── pricing.py               # 定价查询
│   │   ├── evaluations.py           # 评估管理
│   │   ├── shares.py                # 分享链接
│   │   ├── export.py                # 导出功能
│   │   ├── templates.py             # 生命周期模板
│   │   └── auth.py                  # 认证
│   │
│   ├── services/                    # 业务逻辑层
│   │   ├── calculator/              # 计算引擎
│   │   │   ├── base.py              # 基础计算器
│   │   │   ├── s3_standard.py       # S3 Standard
│   │   │   ├── s3_glacier.py        # S3 Glacier IR
│   │   │   ├── lifecycle.py         # 生命周期混合
│   │   │   ├── comparator.py        # 方案对比
│   │   │   ├── sensitivity.py       # 灵敏度分析
│   │   │   └── recommender.py       # 优化推荐
│   │   ├── pricing_service.py       # 定价服务
│   │   ├── excel_export.py          # Excel 导出
│   │   └── auth.py                  # 认证服务
│   │
│   ├── db/                          # 数据库层
│   │   ├── client.py                # 数据库客户端
│   │   ├── dynamodb_client.py       # DynamoDB 客户端
│   │   ├── dynamodb_tables.py       # 表定义
│   │   ├── local_storage.py         # 本地存储
│   │   └── repositories/            # 数据仓库
│   │       ├── evaluations.py
│   │       └── shares.py
│   │
│   └── data/                        # 数据资源
│       ├── aws_pricing/             # AWS 定价 JSON
│       │   ├── ap-northeast-1.json
│       │   └── us-east-1.json
│       └── lifecycle_templates.json
│
├── tests/                           # 测试目录
│   ├── test_calculator_base.py
│   ├── test_s3_standard.py
│   ├── test_s3_glacier.py
│   ├── test_lifecycle.py
│   └── ...
│
├── requirements.txt
└── Dockerfile
```

---

## Calculator 计算引擎详解

### 类继承关系

```
BaseCalculator (base.py)
    │
    ├── S3StandardCalculator (s3_standard.py)
    ├── S3GlacierCalculator (s3_glacier.py)
    └── LifecycleCalculator (lifecycle.py)
```

### BaseCalculator - 基础计算器

**文件**: `services/calculator/base.py` (218行)

提供通用计算方法：

| 方法 | 功能 | 公式 |
|------|------|------|
| `calculate_daily_data_gb()` | 每日数据量 | 根据录像模式计算 |
| `calculate_avg_storage_gb()` | 平均存储量 | 每日数据 × 保留天数 / 2 |
| `calculate_daily_recording_seconds()` | 每日录像时长 | 根据录像模式 |
| `calculate_segments_per_day()` | 每日分片数 | 录像时长 / 分片时长 |
| `calculate_monthly_puts()` | 月度 PUT 请求 | 设备数 × 每日分片数 × 30 |
| `calculate_monthly_gets()` | 月度 GET 请求 | 月度 PUT × 访问比例 |
| `calculate_monthly_retrieval_gb()` | 月度检索量 | 每日数据 × 30 × 访问比例 |
| `calculate_monthly_transfer_gb()` | 月度传输量 | 等于检索量 |

### 录像模式计算逻辑

```python
# 全天候 (24x7)
daily_recording_seconds = 86400

# 事件触发 (EVENT_TRIGGERED)
daily_recording_seconds = events_per_day × event_duration_sec

# 定时段 (SCHEDULED)
daily_recording_seconds = scheduled_hours × 3600
```

### S3StandardCalculator

**文件**: `services/calculator/s3_standard.py` (190行)

**入口方法**: `calculate(input: CostCalculationInput) -> CostSummary`

**费用计算**:
```python
storage_cost = avg_storage_gb × storage_price
put_cost = monthly_puts × put_price / 1000
get_cost = monthly_gets × get_price / 1000
transfer_cost = monthly_transfer_gb × transfer_price
```

### S3GlacierCalculator

**文件**: `services/calculator/s3_glacier.py` (182行)

**额外计算**: 检索费用
```python
retrieval_cost = monthly_retrieval_gb × retrieval_price  # $0.03/GB
```

### LifecycleCalculator

**文件**: `services/calculator/lifecycle.py` (691行)

**最复杂的计算器**，支持多阶段存储策略。

**核心方法**:
- `calculate()` - 主计算入口
- `_calculate_stage_cost()` - 单阶段成本
- `_calculate_lifecycle_transition_cost()` - 转换成本

**多阶段示例**:
```
Stage 1: Day 1-30   → STANDARD
Stage 2: Day 31-365 → GLACIER_IR
Stage 3: Day 366+   → DEEP_ARCHIVE
```

---

## API 路由映射表

| 模块 | 方法 | 路由 | 功能 |
|------|------|------|------|
| calculate | POST | `/api/v1/calculate` | 计算单个配置成本 |
| compare | POST | `/api/v1/compare/configs` | 对比多个配置 |
| compare | POST | `/api/v1/compare/scenarios` | 对比预设场景 |
| scenarios | GET | `/api/v1/scenarios` | 获取场景列表 |
| scenarios | GET | `/api/v1/scenarios/{id}` | 获取场景详情 |
| pricing | GET | `/api/v1/pricing/regions` | 获取支持区域 |
| pricing | GET | `/api/v1/pricing/{region}` | 获取区域定价 |
| pricing | GET | `/api/v1/pricing/video-qualities` | 视频质量列表 |
| evaluations | POST | `/api/v1/evaluations` | 保存评估 |
| evaluations | GET | `/api/v1/evaluations` | 列表查询 |
| evaluations | GET | `/api/v1/evaluations/{id}` | 获取详情 |
| evaluations | PUT | `/api/v1/evaluations/{id}` | 更新评估 |
| evaluations | DELETE | `/api/v1/evaluations/{id}` | 删除评估 |
| shares | POST | `/api/v1/shares` | 创建分享链接 |
| shares | GET | `/api/v1/shares/{id}` | 获取分享内容 |
| shares | POST | `/api/v1/shares/{id}/clone` | 克隆分享 |
| shares | DELETE | `/api/v1/shares/{id}` | 删除分享 |
| export | POST | `/api/v1/export/excel` | 导出 Excel |
| templates | GET | `/api/v1/templates` | 获取生命周期模板 |
| templates | GET | `/api/v1/templates/{id}` | 获取模板详情 |

---

## 服务层组件

### Comparator - 方案对比器

**文件**: `services/calculator/comparator.py` (169行)

| 方法 | 功能 |
|------|------|
| `compare_configs()` | 对比多个配置 |
| `compare_scenarios()` | 对比预设场景 |

**输出**: 最低成本、节省金额、成本差异百分比

### Sensitivity - 灵敏度分析

**文件**: `services/calculator/sensitivity.py` (259行)

| 方法 | 功能 |
|------|------|
| `analyze_sensitivity()` | 分析参数变化影响 |
| 支持单参数/多参数扫描 | 生成敏感性矩阵 |

### Recommender - 优化推荐器

**文件**: `services/calculator/recommender.py` (208行)

| 方法 | 功能 |
|------|------|
| `get_recommendations()` | 获取优化建议 |
| `analyze_cost_breakdown()` | 分析费用构成 |
| `suggest_lifecycle_policy()` | 建议生命周期策略 |

---

## 数据库层

### DynamoDB 表结构

| 表名 | 用途 | 主键 |
|------|------|------|
| Evaluations | 评估记录 | evaluation_id |
| Shares | 分享链接 | share_id |

### Repository 模式

```
db/repositories/
├── evaluations.py   # EvaluationsRepository
└── shares.py        # SharesRepository
```

---

## 代码行数统计

| 模块 | 文件 | 行数 |
|------|------|------|
| models | dimensions.py | 280 |
| models | enums.py | 178 |
| models | pricing.py | 281 |
| models | results.py | 450 |
| calculator | base.py | 218 |
| calculator | s3_standard.py | 190 |
| calculator | s3_glacier.py | 182 |
| calculator | lifecycle.py | 691 |
| calculator | comparator.py | 169 |
| calculator | sensitivity.py | 259 |
| calculator | recommender.py | 208 |
| **总计** | | **~3,100** |
