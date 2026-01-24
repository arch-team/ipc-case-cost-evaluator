# IPC 云存储成本评估系统 - 设计文档

**文档版本**: 1.0
**创建日期**: 2025-01-24
**项目名称**: IPC Cloud Cost Evaluator

---

## 1. 项目概述

### 1.1 项目背景

安防场景下，IPC（网络摄像头）产生的视频监控数据需要存储到云端。不同的用户应用场景、技术选型和定价模型会显著影响云端存储成本。本系统旨在帮助用户评估和对比不同方案的成本，从而做出最优决策。

### 1.2 项目目标

- 提供基于多维度参数的云存储成本计算能力
- 支持多种 AWS 存储方案的成本对比
- 为用户提供成本优化建议
- 支持评估结果的持久化和分享

### 1.3 目标用户

| 用户类型 | 使用场景 |
|---------|---------|
| 内部技术团队 | 快速估算报价、方案评估 |
| 外部客户 | 自助评估云存储成本、方案选型 |

### 1.4 版本规划

| 版本 | 范围 |
|-----|------|
| V1.0 | S3 存储服务成本评估 |
| V2.0 | 增加 KVS (Kinesis Video Streams) 支持 |
| V3.0 | S3 + KVS 混合方案评估 |

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IPC Cloud Cost Evaluator                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐         ┌─────────────────┐         ┌───────────┐ │
│  │   Web Frontend  │  HTTP   │   API Backend   │         │  Data     │ │
│  │   (React/Vue)   │◄───────►│   (FastAPI)     │◄───────►│  Layer    │ │
│  └─────────────────┘         └─────────────────┘         └───────────┘ │
│         │                           │                          │        │
│         ▼                           ▼                          ▼        │
│  ┌─────────────────┐         ┌─────────────────┐         ┌───────────┐ │
│  │ • 场景配置器    │         │ • 成本计算引擎  │         │ • AWS定价 │ │
│  │ • 参数调节器    │         │ • 方案对比器    │         │ • 区域配置│ │
│  │ • 结果可视化    │         │ • 优化推荐器    │         │ • 预设场景│ │
│  │ • Excel导出     │         │ • Excel生成器   │         │ • DynamoDB│ │
│  └─────────────────┘         └─────────────────┘         └───────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术选择 | 说明 |
|-----|---------|------|
| **前端** | React + TypeScript | 类型安全，组件化开发 |
| **UI组件** | Ant Design | 企业级组件库 |
| **图表** | ECharts | 成本趋势、费用占比可视化 |
| **后端** | FastAPI (Python) | 高性能异步框架，自动API文档 |
| **数据处理** | Pandas | 复杂计算与Excel导出 |
| **Excel生成** | openpyxl | 格式化报告输出 |
| **数据库** | AWS DynamoDB | 评估记录持久化 |
| **部署** | Docker + Nginx | 容器化部署 |

---

## 3. 维度模型设计

### 3.1 三类维度框架

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           维度模型框架                                   │
├──────────────────┬──────────────────┬───────────────────────────────────┤
│    功能维度       │    技术维度       │       服务价格模型维度            │
│   (业务场景)      │   (方案选型)      │         (AWS定价)                │
├──────────────────┼──────────────────┼───────────────────────────────────┤
│ • 设备数量        │ • 存储类型        │ • AWS 区域                       │
│ • 录像模式        │ • 生命周期策略    │ • 折扣比例                        │
│ • 视频质量        │                  │ • 费用项                          │
│ • 访问模式        │                  │ • 计费单位                        │
│ • 存储周期        │                  │                                   │
│ • 每日事件数      │                  │                                   │
│ • 事件时长        │                  │                                   │
│ • 分片传输策略    │                  │                                   │
└──────────────────┴──────────────────┴───────────────────────────────────┘
```

### 3.2 功能维度（业务相关）

| 维度 | 字段名 | 类型 | 说明 | 可选值 |
|-----|-------|------|------|-------|
| 设备数量 | device_count | int | 摄像头数量 | 1 - 100,000+ |
| 录像模式 | recording_mode | enum | 触发方式 | 全天候 / 事件触发 / 定时段 |
| 视频质量 | video_quality | enum | 分辨率码率 | 720p / 1080p / 2K / 4K |
| 访问模式 | access_pattern | float | 回看比例 | 0.0 - 1.0 |
| 存储周期 | retention_days | int | 保留天数 | 7 / 30 / 60 / 90 / 180 / 365 |
| 每日事件数 | events_per_day | int | 事件触发次数 | 自定义数值 |
| 事件时长 | event_duration_sec | int | 单次事件秒数 | 自定义数值 |
| 分片传输策略 | segment_strategy | enum | 设备端上传方式 | 固定时长 / 固定大小 / 实时流 |
| 分片值 | segment_value | int | 分片参数值 | 秒数或KB |

### 3.3 技术维度（方案选型）

| 维度 | 字段名 | 类型 | 说明 | 可选值 |
|-----|-------|------|------|-------|
| 存储类型 | storage_class | enum | S3 存储类 | STANDARD / GLACIER_IR / DEEP_ARCHIVE |
| 生命周期启用 | lifecycle_enabled | bool | 是否启用 | true / false |
| 转换天数 | transition_days | int | N天后转换 | 自定义数值 |
| 目标存储类型 | target_class | enum | 转换目标 | GLACIER_IR / DEEP_ARCHIVE |

### 3.4 服务价格模型维度

| 维度 | 字段名 | 类型 | 说明 | 可选值 |
|-----|-------|------|------|-------|
| AWS 区域 | region | string | 部署区域 | ap-northeast-1 / us-east-1 / ... |
| 折扣比例 | discount_percent | float | 企业折扣 | 0.0 - 0.5 |
| 费用模型 | pricing_model | enum | 计费方式 | ON_DEMAND / RESERVED |

### 3.5 AWS S3 费用项

| 费用项 | 字段名 | 计费单位 | 说明 |
|-------|-------|---------|------|
| PUT 请求 | put_request | 每千次请求 | 上传请求费用 |
| GET 请求 | get_request | 每千次请求 | 下载请求费用 |
| 存储 | storage | 每GB-月 | 存储空间费用 |
| 数据传输出站 | data_transfer_out | 每GB | 下载流量费用 |
| 检索 | retrieval | 每GB | Glacier 检索费用 |
| 生命周期转换 | lifecycle_transition | 每千次请求 | 存储类转换费用 |

### 3.6 视频质量预设参数

| 质量 | 分辨率 | 码率 (Kbps) | 每秒数据量 (KB) |
|-----|--------|-------------|----------------|
| 720p | 1280×720 | 1,000 | 125 |
| 1080p | 1920×1080 | 2,500 | 312.5 |
| 2K | 2560×1440 | 5,000 | 625 |
| 4K | 3840×2160 | 12,000 | 1,500 |

---

## 4. 成本计算逻辑

### 4.1 计算流程

```
功能维度输入                    中间计算                      费用计算
─────────────                  ─────────                    ─────────

设备数 ──────┐
录像模式 ────┼──► 每日数据量(GB) ──────┐
视频质量 ────┤                        │
事件数/时长 ─┘                        ├──► 存储费用
                                      │
存储周期 ─────────► 平均存储量(GB) ───┘

分片策略 ────┬──► 每日PUT请求数 ───────────► PUT请求费用
分片值 ──────┘

访问模式 ────┬──► 每日GET请求数 ───┬───────► GET请求费用
每日数据量 ──┘                    └───────► 检索费用(Glacier)
                                          └► 数据传输费用

生命周期策略 ──────► 转换请求数 ──────────► 生命周期转换费用
```

### 4.2 核心计算公式

#### 4.2.1 数据量计算

```python
# 每日数据量 (GB)
if recording_mode == "全天候":
    daily_data_gb = device_count * data_rate_kb * 86400 / 1024 / 1024
elif recording_mode == "事件触发":
    daily_data_gb = device_count * data_rate_kb * events_per_day * event_duration_sec / 1024 / 1024
elif recording_mode == "定时段":
    daily_data_gb = device_count * data_rate_kb * scheduled_hours * 3600 / 1024 / 1024

# 平均存储量 (GB) - 稳态下的存储占用
avg_storage_gb = daily_data_gb * retention_days
```

#### 4.2.2 请求数计算

```python
# 每日 PUT 请求数
if segment_strategy == "固定时长":
    segments_per_day = daily_recording_seconds / segment_seconds
elif segment_strategy == "固定大小":
    segments_per_day = daily_data_gb * 1024 * 1024 / segment_size_kb
elif segment_strategy == "实时流":
    segments_per_day = daily_recording_seconds  # 每秒一个请求（近似）

monthly_puts = device_count * segments_per_day * 30

# 每日 GET 请求数
monthly_gets = monthly_puts * access_pattern
```

#### 4.2.3 费用计算

```python
# 月度存储费用
storage_cost = avg_storage_gb * price_per_gb_month * (1 - discount)

# PUT 请求费用
put_cost = (monthly_puts / 1000) * put_price_per_1000 * (1 - discount)

# GET 请求费用
get_cost = (monthly_gets / 1000) * get_price_per_1000 * (1 - discount)

# 检索费用 (仅 Glacier 类型)
retrieval_data_gb = daily_data_gb * 30 * access_pattern
retrieval_cost = retrieval_data_gb * retrieval_price_per_gb * (1 - discount)

# 数据传输出站费用
dto_cost = retrieval_data_gb * dto_price_per_gb * (1 - discount)

# 生命周期转换费用 (若启用)
if lifecycle_enabled:
    daily_objects = segments_per_day * device_count
    lifecycle_cost = (daily_objects * 30 / 1000) * transition_price_per_1000 * (1 - discount)

# 总费用
total_monthly_cost = storage_cost + put_cost + get_cost + retrieval_cost + dto_cost + lifecycle_cost
```

#### 4.2.4 生命周期混合策略计算

```python
# 混合策略: Standard(N天) → Glacier IR(剩余天数)

# Standard 部分
standard_days = min(transition_days, retention_days)
standard_storage_gb = daily_data_gb * standard_days
standard_storage_cost = standard_storage_gb * standard_price

# Glacier 部分
glacier_days = max(0, retention_days - transition_days)
glacier_storage_gb = daily_data_gb * glacier_days
glacier_storage_cost = glacier_storage_gb * glacier_price

# 访问费用按比例分配（假设近期数据访问更频繁）
recent_access_ratio = 0.8  # 80%访问发生在Standard阶段
```

---

## 5. 数据持久化设计

### 5.1 DynamoDB 表设计

#### 5.1.1 用户表 (Users)

```yaml
Table: Users
  Partition Key: user_id (string, UUID)

  Attributes:
    user_id: string           # UUID
    email: string             # 登录邮箱
    name: string              # 用户名称
    password_hash: string     # 密码哈希
    created_at: string        # ISO 时间戳
    last_login: string        # 最后登录时间

  GSI-1 (邮箱查询):
    Partition Key: email
    Projection: ALL
```

#### 5.1.2 评估记录表 (Evaluations)

```yaml
Table: Evaluations
  Partition Key: user_id (string)
  Sort Key: evaluation_id (string, UUID)

  Attributes:
    user_id: string
    evaluation_id: string
    name: string              # 评估名称
    description: string       # 备注说明

    # 输入参数 (JSON 存储)
    functional_dims: map      # 功能维度
    technical_dims: map       # 技术维度
    pricing_dims: map         # 价格模型

    # 计算结果 (JSON 存储)
    result_summary: map       # 成本汇总
    result_breakdown: map     # 费用明细
    result_comparison: map    # 方案对比
    recommendation: string    # 优化建议

    # 元数据
    tags: list<string>        # 标签列表
    version: number           # 版本号
    created_at: string
    updated_at: string

  GSI-1 (按更新时间排序):
    Partition Key: user_id
    Sort Key: updated_at
    Projection: KEYS_ONLY
```

#### 5.1.3 分享表 (Shares)

```yaml
Table: Shares
  Partition Key: share_token (string)

  Attributes:
    share_token: string       # 分享链接 token
    user_id: string           # 创建者
    evaluation_id: string     # 关联的评估
    permission: string        # VIEW | DUPLICATE
    expires_at: string        # 过期时间 (TTL)
    created_at: string

  TTL Attribute: expires_at   # 自动过期删除
```

#### 5.1.4 评估历史表 (EvaluationHistory)

```yaml
Table: EvaluationHistory
  Partition Key: evaluation_id (string)
  Sort Key: version (number)

  Attributes:
    evaluation_id: string
    version: number
    snapshot: map             # 完整数据快照
    change_note: string       # 修改说明
    created_at: string
    created_by: string
```

---

## 6. API 接口设计

### 6.1 认证接口

```yaml
POST /api/v1/auth/register
  Request:  { email, password, name }
  Response: { user_id, token }

POST /api/v1/auth/login
  Request:  { email, password }
  Response: { user_id, token }

GET  /api/v1/auth/me
  Response: { user_id, email, name }
```

### 6.2 成本计算接口

```yaml
POST /api/v1/calculate
  Request:  { functional, technical, pricing }
  Response: { total_cost, breakdown, per_device_cost }

POST /api/v1/compare
  Request:  { functional, pricing, strategies[] }
  Response: { comparisons[], recommendation }
```

### 6.3 预设场景接口

```yaml
GET /api/v1/scenarios
  Response: { scenarios[] }

GET /api/v1/scenarios/{id}
  Response: { functional, technical, pricing }
```

### 6.4 定价数据接口

```yaml
GET /api/v1/pricing/regions
  Response: { regions[] }

GET /api/v1/pricing/{region}
  Response: { s3_pricing_items }
```

### 6.5 评估记录接口

```yaml
GET  /api/v1/evaluations
  Query:    { limit?, last_key?, tags[]? }
  Response: { items[], last_key }

POST /api/v1/evaluations
  Request:  { name, description?, functional, technical, pricing, tags[]? }
  Response: { evaluation_id, ... }

GET  /api/v1/evaluations/{id}
  Response: { evaluation }

PUT  /api/v1/evaluations/{id}
  Request:  { name?, description?, functional?, technical?, pricing?, tags[]? }
  Response: { evaluation }

DELETE /api/v1/evaluations/{id}

POST /api/v1/evaluations/{id}/duplicate
  Request:  { name }
  Response: { new_evaluation }
```

### 6.6 分享接口

```yaml
POST /api/v1/evaluations/{id}/share
  Request:  { permission: "VIEW" | "DUPLICATE", expires_days?: 7 }
  Response: { share_url, token, expires_at }

GET  /api/v1/shared/{token}
  Response: { evaluation, permission }

DELETE /api/v1/evaluations/{id}/share/{token}
```

### 6.7 导出接口

```yaml
POST /api/v1/export
  Request:  { calculation_result, compare_result }
  Response: Excel file (binary)
```

---

## 7. 用户界面设计

### 7.1 页面结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│  IPC Cloud Cost Evaluator           [我的评估▼] [区域▼] [👤 用户名 ▼]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📋 预设场景快速选择                                              │   │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │   │
│  │ │家庭安防│ │小型商铺│ │中型企业│ │大型工厂│ │自定义  │         │   │
│  │ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ ⚙️ 功能维度配置       │  │ 📊 成本计算结果                        │  │
│  │                      │  │                                        │  │
│  │ 设备数量    [10000]  │  │  月度总成本: $45,912                   │  │
│  │ 录像模式    [事件▼]  │  │  每设备成本: $0.46/月                  │  │
│  │ 视频质量    [1080p▼] │  │                                        │  │
│  │ 回看比例    [===○10%]│  │  ┌─────────────────────────────────┐  │  │
│  │ 存储周期    [30天▼]  │  │  │ 费用明细饼图                    │  │  │
│  │ 每日事件    [400]    │  │  └─────────────────────────────────┘  │  │
│  │ 事件时长    [15秒]   │  │                                        │  │
│  │ 分片策略    [15秒▼]  │  │  ┌─────────────────────────────────┐  │  │
│  │                      │  │  │ 方案对比表格                    │  │  │
│  ├──────────────────────┤  │  └─────────────────────────────────┘  │  │
│  │ 🔧 技术维度配置       │  │                                        │  │
│  │ 存储类型  [Standard▼]│  │  💡 推荐: S3 Standard                  │  │
│  │ 生命周期  [关闭▼]    │  │  原因: 存储周期短，访问频率中等        │  │
│  ├──────────────────────┤  │                                        │  │
│  │ 💰 价格模型配置       │  └────────────────────────────────────────┘  │
│  │ AWS区域 [ap-northeast-1▼]│                                          │
│  │ 折扣比例 [===○ 0%]   │                                              │
│  └──────────────────────┘                                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  [💾 保存评估] [📥 导出Excel] [🔗 分享链接] [📋 复制为新评估]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 预设场景配置

| 场景 | 设备数 | 录像模式 | 质量 | 回看 | 存储 | 事件数 | 事件时长 |
|-----|-------|---------|------|-----|------|-------|---------|
| 家庭安防 | 3 | 事件触发 | 1080p | 5% | 30天 | 50 | 15秒 |
| 小型商铺 | 20 | 定时段 | 1080p | 10% | 30天 | 100 | 30秒 |
| 中型企业 | 200 | 全天候 | 1080p | 15% | 60天 | - | - |
| 大型工厂 | 2000 | 全天候 | 2K | 20% | 90天 | - | - |

### 7.3 交互流程

```
用户进入系统
     │
     ▼
┌─────────────┐     ┌─────────────┐
│ 选择预设场景 │────►│ 自动填充参数 │
└─────────────┘     └──────┬──────┘
     │                     │
     ▼                     ▼
┌─────────────┐     ┌─────────────┐
│ 自定义模式  │────►│ 手动配置参数 │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ 实时计算成本 │◄──── 参数变化时自动触发
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ 费用明细  │ │ 方案对比  │ │ 优化建议  │
       └───────────┘ └───────────┘ └───────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ 保存/导出   │
                    └─────────────┘
```

---

## 8. Excel 报告结构

### 8.1 Sheet 1: 评估概览

- 评估基本信息（名称、人员、日期）
- 输入参数摘要（三类维度）
- 成本汇总（月度/年度/每设备成本）
- 推荐方案

### 8.2 Sheet 2: 费用明细

- 各费用项的计算说明
- 月费用金额
- 占比百分比
- 折扣前后对比

### 8.3 Sheet 3: 方案对比

- 多种存储策略的成本对比表
- 相对基准的差异百分比
- 可视化对比图表

### 8.4 Sheet 4: 成本趋势

- 12个月逐月成本明细
- 存储量变化趋势
- 年度合计

### 8.5 Sheet 5: 优化建议

- 当前方案分析
- 潜在优化方向
- 敏感度分析

---

## 9. 优化推荐逻辑

### 9.1 推荐规则

| 规则 | 条件 | 建议 |
|-----|------|------|
| 短期存储 | retention_days ≤ 30 | 使用 S3 Standard |
| 长期存储 | retention_days ≥ 90 | 启用生命周期策略 |
| 低访问 | access_pattern < 5% | 考虑 Glacier IR |
| 高访问 | access_pattern > 30% | 使用 S3 Standard |
| 大规模 | device_count ≥ 5000 | 申请企业折扣 |

### 9.2 敏感度分析

分析以下参数变化对成本的影响：
- 设备数 +50%
- 存储周期 ×3
- 回看比例 ×3
- 视频质量升级

---

## 10. 项目目录结构

```
ipc-case-cost-evaluator/
├── backend/                          # Python 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI 入口
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── calculate.py      # 成本计算接口
│   │   │   │   ├── scenarios.py      # 预设场景接口
│   │   │   │   ├── pricing.py        # 定价查询接口
│   │   │   │   ├── export.py         # Excel导出接口
│   │   │   │   ├── auth.py           # 认证接口
│   │   │   │   ├── evaluations.py    # 评估记录接口
│   │   │   │   └── shares.py         # 分享接口
│   │   │   └── dependencies.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py             # 应用配置
│   │   │   └── constants.py          # 常量定义
│   │   │
│   │   ├── models/                   # 数据模型
│   │   │   ├── dimensions.py         # 三类维度模型
│   │   │   ├── pricing.py            # 定价模型
│   │   │   ├── results.py            # 计算结果模型
│   │   │   ├── user.py               # 用户模型
│   │   │   ├── evaluation.py         # 评估记录模型
│   │   │   └── share.py              # 分享模型
│   │   │
│   │   ├── services/                 # 业务逻辑
│   │   │   ├── calculator/
│   │   │   │   ├── base.py           # 计算器基类
│   │   │   │   ├── s3_standard.py    # S3 Standard 计算
│   │   │   │   ├── s3_glacier.py     # Glacier 计算
│   │   │   │   └── lifecycle.py      # 生命周期混合计算
│   │   │   ├── comparator.py         # 方案对比服务
│   │   │   ├── optimizer.py          # 优化推荐服务
│   │   │   ├── exporter.py           # Excel导出服务
│   │   │   ├── auth_service.py       # 认证服务
│   │   │   ├── evaluation_service.py # 评估服务
│   │   │   └── share_service.py      # 分享服务
│   │   │
│   │   ├── db/                       # DynamoDB 层
│   │   │   ├── dynamodb.py           # DynamoDB 客户端
│   │   │   └── repositories/
│   │   │       ├── user_repo.py
│   │   │       ├── evaluation_repo.py
│   │   │       └── share_repo.py
│   │   │
│   │   └── data/                     # 静态数据
│   │       ├── aws_pricing/          # AWS 各区域定价
│   │       │   ├── ap-northeast-1.json
│   │       │   ├── us-east-1.json
│   │       │   └── ...
│   │       └── scenarios/            # 预设场景
│   │           └── presets.json
│   │
│   ├── tests/                        # 测试用例
│   │   ├── test_calculator.py
│   │   ├── test_comparator.py
│   │   └── test_api.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                         # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScenarioSelector/     # 场景选择器
│   │   │   ├── DimensionConfig/      # 维度配置面板
│   │   │   ├── ResultDisplay/        # 结果展示
│   │   │   ├── EvaluationList/       # 评估列表
│   │   │   ├── ShareDialog/          # 分享弹窗
│   │   │   └── ExportButton/
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCalculator.ts
│   │   │   └── usePricing.ts
│   │   │
│   │   ├── services/
│   │   │   └── api.ts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   └── Dockerfile
│
├── docs/
│   ├── CODEMAPS/                     # 架构文档
│   ├── plans/                        # 设计文档
│   └── api/                          # API 文档
│
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

---

## 11. 依赖清单

### 11.1 后端依赖 (requirements.txt)

```txt
# Web 框架
fastapi>=0.109.0
uvicorn>=0.27.0
python-multipart>=0.0.6

# 数据处理
pandas>=2.2.0
openpyxl>=3.1.2

# AWS
boto3>=1.34.0

# 认证
python-jose>=3.3.0
passlib>=1.7.4
bcrypt>=4.1.0

# 数据验证
pydantic>=2.5.0

# 测试
pytest>=8.0.0
pytest-asyncio>=0.23.0
httpx>=0.26.0
```

### 11.2 前端依赖 (package.json 核心)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.3.0",
    "antd": "^5.13.0",
    "echarts": "^5.4.0",
    "axios": "^1.6.0",
    "@ant-design/icons": "^5.2.0"
  }
}
```

---

## 12. 交付物清单

| 交付物 | 说明 |
|-------|------|
| Web 应用 | 前后端完整应用 |
| API 接口文档 | OpenAPI/Swagger 格式 |
| 预设场景配置 | JSON 配置文件 |
| AWS 定价数据 | 多区域定价 JSON |
| Excel 报告模板 | 格式化报告样式 |
| 部署文档 | Docker 部署说明 |
| 用户手册 | 使用指南 |

---

## 13. 后续扩展规划

### V2.0 - KVS 支持

- 增加 Kinesis Video Streams 成本计算
- KVS 特有费用项：流入数据、流出数据、存储
- KVS vs S3 方案对比

### V3.0 - 混合方案

- S3 + KVS 混合存储方案
- 实时流用 KVS，归档用 S3
- 智能方案推荐

---

**文档结束**
