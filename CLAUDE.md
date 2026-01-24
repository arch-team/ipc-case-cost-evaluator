# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Response Language
**所有对话和文档必须（Must）使用中文。**
**除非有特殊说明,请用中文回答。** (Unless otherwise specified, please respond in Chinese.)
### 强制要求

- 所有对话必须使用中文
- 代码注释使用中文
- 文档内容使用中文
- Git 提交信息使用中文

## 项目概述

IPC Case Cost Evaluator - AWS S3 云存储成本评估工具，用于计算和对比 IPC（网络摄像头）视频监控数据的存储成本。

## 开发命令

```bash
# 环境设置
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install pandas openpyxl

# 运行测试 (计划中)
pytest tests/
pytest tests/test_calculator.py -v  # 单个测试文件
pytest tests/test_calculator.py::test_standard_cost -v  # 单个测试函数
```

## 架构概览

```
Input (DeviceParams) → Calculator Engine → Output (CostBreakdown/ComparisonResult)
         ↓                    ↓                      ↓
    设备参数配置          成本计算逻辑              Excel 报告
```

### 核心模块

- **`src/calculator/`** - 成本计算引擎
  - `base.py` - 抽象基类 `BaseCostCalculator`
  - `standard.py` - S3 Standard 计算器
  - `glacier.py` - S3 Glacier IR 计算器
  - `lifecycle.py` - 混合生命周期策略计算器
  - `comparator.py` - 多策略对比

- **`src/models/`** - 数据模型
  - `params.py` - 输入参数 `DeviceParams`
  - `pricing.py` - AWS 定价常量 `AWSPricing`
  - `results.py` - 计算结果 `CostBreakdown`, `ComparisonResult`
  - `enums.py` - 存储类型枚举 `StorageClass`

- **`src/io/`** - Excel 读写
  - `excel_reader.py` - 解析输入文件
  - `excel_writer.py` - 生成报告
  - `formatters.py` - 格式化工具

### 成本计算公式

```python
# 月度 PUT 请求数
monthly_puts = events_per_day * segments_per_event * 30

# 平均存储量 (GB)
avg_storage_gb = daily_data_gb * retention_days

# 总成本
total = put_request_cost + get_request_cost + get_retrieval_cost + storage_cost + dto_cost + lifecycle_cost
```

### AWS 定价 (ap-northeast-1 区域)

| 项目 | S3 Standard | S3 Glacier IR |
|------|-------------|---------------|
| PUT 请求 | $0.00368/千次 | $0.02/千次 |
| GET 请求 | $0.00029/千次 | $0.01/千次 |
| GET 检索 | - | $0.03/GB |
| 存储 | $0.01544/GB | $0.004/GB |
| 数据传输出站 | $0.0225/GB | $0.0225/GB |
| 生命周期转换 | - | $0.02/千次 |

## 详细文档

- [架构概览](docs/CODEMAPS/INDEX.md)
- [计算模块](docs/CODEMAPS/calculator.md)
- [数据模型](docs/CODEMAPS/models.md)
- [I/O 模块](docs/CODEMAPS/io.md)

## 数据源

`AWS S3云存成本V4.xlsx` - 原始成本数据和参考值
