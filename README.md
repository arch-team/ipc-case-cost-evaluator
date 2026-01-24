# IPC Case Cost Evaluator

AWS S3 云存储成本评估系统，基于 FastAPI 构建的 Web API，用于计算和对比 IPC（网络摄像头）视频监控数据的存储成本。

## 功能特性

- **多策略对比**: S3 Standard vs S3 Glacier Instant Retrieval vs 混合生命周期策略
- **三维度建模**: 功能维度 × 技术维度 × 价格维度，灵活组合计算场景
- **完整成本模型**: PUT/GET 请求费、存储费、数据传输费、生命周期转换费
- **多区域支持**: 支持不同 AWS 区域的定价计算
- **批量计算**: 支持从 1 台到 100,000+ 台设备的规模化计算

## 快速开始

### 环境要求

- Python 3.11+

### 安装

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
```

### 运行

```bash
# 启动开发服务器
uvicorn app.main:app --reload

# 运行测试
pytest tests/ -v
```

### API 使用示例

```python
from app.models import FunctionalDimensions, CostCalculationInput
from app.services.calculator import S3StandardCalculator

# 定义功能维度参数
functional = FunctionalDimensions(
    device_count=100000,          # 设备数
    recording_mode="event_triggered",  # 录像模式
    video_quality="1080p",        # 视频质量
    events_per_day=400,           # 每天事件数
    event_duration_sec=15,        # 事件时长
    access_pattern=0.1,           # 回看比例 (10%)
    retention_days=30,            # 存储天数
)

# 构建计算输入
input_data = CostCalculationInput(functional=functional)

# 计算成本
calculator = S3StandardCalculator()
result = calculator.calculate(input_data)

print(f"月度总成本: ${result.monthly_total:,.2f}")
print(f"单设备月成本: ${result.per_device_monthly:.4f}")
```

## 三维度成本模型

### 功能维度 (FunctionalDimensions)

业务场景相关参数，决定存储需求规模。

| 参数 | 说明 | 典型值 |
|------|------|--------|
| device_count | 设备数量 | 1 - 100,000+ |
| recording_mode | 录像模式 | continuous / event_triggered / scheduled |
| video_quality | 视频质量 | 720p / 1080p / 2K / 4K |
| events_per_day | 每日事件数 | 400 |
| event_duration_sec | 事件时长 (秒) | 15 |
| access_pattern | 回看比例 | 0.1 (10%) |
| retention_days | 存储天数 | 7 / 30 / 60 / 90 / 180 |

### 技术维度 (TechnicalDimensions)

方案选型相关参数，决定使用何种存储方案。

| 参数 | 说明 | 可选值 |
|------|------|--------|
| storage_class | 存储类型 | STANDARD / GLACIER_IR |
| lifecycle_policy | 生命周期策略 | 启用/禁用，转换天数 |

### 价格维度 (PricingDimensions)

AWS 定价相关参数，影响最终成本。

| 参数 | 说明 | 默认值 |
|------|------|--------|
| region | AWS 区域 | ap-northeast-1 |
| discount_percent | 折扣比例 | 0 (无折扣) |

## 成本计算公式

```
总费用 = 存储费 + PUT请求费 + GET请求费 + GET检索费 + 数据传输费 + 生命周期转换费
```

### AWS 定价参考 (ap-northeast-1)

| 成本项 | S3 Standard | S3 Glacier IR |
|--------|-------------|---------------|
| 存储 | $0.025/GB | $0.004/GB |
| PUT 请求 | $0.0047/千次 | $0.02/千次 |
| GET 请求 | $0.00037/千次 | $0.01/千次 |
| GET 检索 | - | $0.03/GB |
| 生命周期转换 | - | $0.02/千次 |
| 数据传输出站 | $0.114/GB | 同左 |

## 存储策略对比

| 策略 | 特点 | 适用场景 |
|------|------|----------|
| S3 Standard | 高性能，高成本 | 频繁访问，短期存储 |
| S3 Glacier IR | 低存储成本，高检索成本 | 长期归档，偶尔访问 |
| 混合策略 | N 天后自动转换 | 访问频率随时间递减 |

## 项目结构

```
ipc-case-cost-evaluator/
├── backend/                      # 后端服务
│   ├── app/
│   │   ├── api/                  # API 路由
│   │   ├── core/                 # 核心配置
│   │   ├── models/               # 数据模型 (Pydantic)
│   │   │   ├── dimensions.py     # 三类维度定义
│   │   │   ├── enums.py          # 枚举类型
│   │   │   ├── pricing.py        # AWS 定价模型
│   │   │   └── results.py        # 计算结果模型
│   │   ├── services/
│   │   │   └── calculator/       # 成本计算引擎
│   │   │       ├── base.py       # 基础计算器
│   │   │       ├── s3_standard.py
│   │   │       └── s3_glacier.py
│   │   └── data/
│   │       └── aws_pricing/      # 区域定价 JSON
│   ├── tests/                    # 单元测试
│   └── requirements.txt
├── docs/
│   └── plans/                    # 设计文档
├── CLAUDE.md                     # Claude Code 指引
└── README.md
```

## License

MIT
