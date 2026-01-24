# IPC Case Cost Evaluator

AWS S3 云存储成本评估工具，用于计算和对比 IPC（网络摄像头）视频监控数据的存储成本。

## 功能

- **多策略对比**: S3 Standard vs S3 Glacier Instant Retrieval vs 混合生命周期策略
- **完整成本模型**: PUT/GET 请求费、存储费、数据传输费、生命周期转换费
- **批量计算**: 支持从 1 台到 100,000+ 台设备的规模化计算
- **多存储周期**: 支持 7/30/60/90/180 天存储周期

## 快速开始

### 环境要求

- Python 3.11+
- pandas
- openpyxl

### 安装

```bash
# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 安装依赖
pip install pandas openpyxl
```

### 使用

```python
from src.calculator import StandardCalculator, compare_strategies
from src.models import DeviceParams

# 定义设备参数
params = DeviceParams(
    device_count=100000,        # 设备数
    data_rate_kb=136.533,       # 每秒数据量 (KB)
    segment_seconds=15,         # 录像分片秒数
    event_seconds=15,           # 每个事件秒数
    events_per_day=400,         # 每天事件数
    get_ratio=0.1,              # GET 比例 (10%)
    retention_days=30           # 存储天数
)

# 对比所有策略
result = compare_strategies(params)
print(result.summary())
```

## 成本计算模型

### 输入参数

| 参数 | 说明 | 典型值 |
|-----|------|-------|
| device_count | 设备数量 | 1 - 100,000+ |
| data_rate_kb | 每秒数据量 (KB) | 136.533 |
| segment_seconds | 录像分片秒数 | 15 |
| event_seconds | 每个事件秒数 | 15 |
| events_per_day | 每天事件数 | 400 |
| get_ratio | GET 比例 | 0.1 (10%) |
| retention_days | 存储天数 | 7/30/60/90/180 |

### 成本组成

```
总费用 = PUT请求费 + GET请求费 + GET检索费 + 存储费 + 数据传输费 + 生命周期转换费
```

| 成本项 | S3 Standard | S3 Glacier IR |
|-------|-------------|---------------|
| PUT 请求 | $0.00368/千次 | $0.02/千次 |
| GET 请求 | $0.00029/千次 | $0.01/千次 |
| GET 检索 | - | $0.03/GB |
| 存储 | $0.01544/GB | $0.004/GB |
| 数据传输 | $0.0225/GB | $0.0225/GB |
| 生命周期转换 | - | $0.02/千次 |

## 存储策略对比

### 1. S3 Standard
- 最高性能，最高成本
- 适合频繁访问的数据

### 2. S3 Glacier Instant Retrieval
- 低存储成本，高请求成本
- 适合长期归档，偶尔访问

### 3. 混合策略 (Standard → Glacier)
- N 天后自动转换到 Glacier
- 平衡性能和成本

## 项目结构

```
ipc-case-cost-evaluator/
├── README.md                 # 项目说明
├── src/                      # 源代码
│   ├── calculator/           # 成本计算引擎
│   ├── models/               # 数据模型
│   └── io/                   # Excel 读写
├── tests/                    # 测试用例
├── docs/                     # 文档
│   └── CODEMAPS/            # 架构文档
├── scripts/                  # 工具脚本
└── AWS S3云存成本V4.xlsx     # 原始数据
```

## 文档

- [架构概览](docs/CODEMAPS/INDEX.md)
- [计算模块](docs/CODEMAPS/calculator.md)
- [数据模型](docs/CODEMAPS/models.md)
- [I/O 模块](docs/CODEMAPS/io.md)

## 示例输出

### 30 天存储，100,000 台设备

| 策略 | 每台/月 | 总费用/月 | vs Standard |
|-----|--------|----------|-------------|
| S3 Standard | $0.46 | $45,912 | - |
| S3 Glacier IR | $0.66 | $65,630 | +43% |
| STD 3天 → GIR | $0.67 | $67,107 | +46% |

> 注：短期存储 (30天) 时，Standard 更经济；长期存储 (90-180天) 时，Glacier 或混合策略更优。

## License

MIT
