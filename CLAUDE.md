# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言要求
**所有对话、代码注释、文档和 Git 提交信息必须使用中文。**

## 项目概述

IPC Case Cost Evaluator - AWS S3 云存储成本评估系统，基于 FastAPI 构建的 Web API，用于计算和对比 IPC（网络摄像头）视频监控数据的存储成本。

## 开发命令

```bash
# 环境设置
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
```

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    三维度成本计算模型                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Functional   │    │ Technical    │    │ Pricing      │      │
│  │ Dimensions   │    │ Dimensions   │    │ Dimensions   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        │                    │                    │              │
│        └────────────────────┼────────────────────┘              │
│                             ▼                                   │
│                    ┌──────────────────┐                         │
│                    │ Calculator Engine│                         │
│                    │ - BaseCalculator │                         │
│                    │ - S3Standard     │                         │
│                    │ - Glacier (TBD)  │                         │
│                    └──────────────────┘                         │
│                             │                                   │
│                             ▼                                   │
│                    ┌──────────────────┐                         │
│                    │ CostSummary      │                         │
│                    │ - CostBreakdown  │                         │
│                    │ - Metrics        │                         │
│                    └──────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 三类维度

- **FunctionalDimensions** (`backend/app/models/dimensions.py:44`) - 功能维度：设备数、录像模式、视频质量、回看比例、保留天数、分片策略
- **TechnicalDimensions** (`backend/app/models/dimensions.py:126`) - 技术维度：存储类型 (Standard/Glacier IR)、生命周期策略
- **PricingDimensions** (`backend/app/models/dimensions.py:147`) - 价格维度：区域、折扣比例、计费模式

### 核心模块

- **`backend/app/services/calculator/`** - 成本计算引擎
  - `base.py` - 基础计算器，通用的数据量和请求数计算方法
  - `s3_standard.py` - S3 Standard 存储类型计算器

- **`backend/app/models/`** - 数据模型 (Pydantic)
  - `dimensions.py` - 三类维度定义和 `CostCalculationInput`
  - `enums.py` - 枚举：`RecordingMode`, `VideoQuality`, `SegmentStrategy`, `StorageClass`
  - `pricing.py` - AWS 定价模型和 `PricingLoader`
  - `results.py` - 计算结果：`CostBreakdown`, `CostSummary`, `ComparisonResult`

- **`backend/app/data/aws_pricing/`** - 区域定价 JSON 文件

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

### AWS 定价 (ap-northeast-1)

| 项目 | S3 Standard | S3 Glacier IR |
|------|-------------|---------------|
| 存储 | $0.025/GB | $0.004/GB |
| PUT 请求 | $0.0047/千次 | $0.02/千次 |
| GET 请求 | $0.00037/千次 | $0.01/千次 |
| GET 检索 | - | $0.03/GB |
| 生命周期转换 | - | $0.02/千次 |
| 数据传输出站 | $0.114/GB (前10TB) | 同左 |

## 详细文档

- [架构概览](docs/CODEMAPS/INDEX.md)
- [计算模块](docs/CODEMAPS/calculator.md)
- [数据模型](docs/CODEMAPS/models.md)
