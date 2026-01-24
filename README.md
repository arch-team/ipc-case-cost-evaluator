# IPC Case Cost Evaluator

AWS S3 云存储成本评估系统，用于计算和对比 IPC（网络摄像头）视频监控数据的存储成本。

## 功能特性

- **精准成本计算**: 基于 AWS S3 官方定价，精确计算存储、请求和传输费用
- **多策略对比**: S3 Standard vs S3 Glacier Instant Retrieval vs 混合生命周期策略
- **三维度建模**: 功能维度 × 技术维度 × 价格维度，灵活组合计算场景
- **智能推荐**: 基于使用模式提供成本优化建议
- **导出报告**: 支持导出 Excel 报告
- **评估管理**: 保存和管理历史评估记录

## 快速开始

### 使用 Docker (推荐)

```bash
# 克隆项目
git clone <repository-url>
cd ipc-case-cost-evaluator

# 复制环境配置
cp .env.example .env

# 启动服务
docker-compose up -d

# 访问应用
# 前端: http://localhost
# 后端 API: http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 开发环境

```bash
# 使用开发模式启动 (支持热重载)
docker-compose -f docker-compose.dev.yml up
```

### 本地开发

#### 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload

# 运行测试
pytest tests/ -v
```

#### 前端

```bash
cd frontend
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/calculate` | POST | 计算存储成本 |
| `/api/v1/compare` | POST | 对比多种存储方案 |
| `/api/v1/scenarios` | GET | 获取预设场景 |
| `/api/v1/pricing/regions` | GET | 获取支持的区域 |
| `/api/v1/pricing/{region}` | GET | 获取区域定价 |
| `/api/v1/export` | POST | 导出 Excel 报告 |
| `/api/v1/evaluations` | CRUD | 评估记录管理 |
| `/api/v1/auth/*` | POST | 用户认证 |

## 三维度成本模型

### 功能维度 (FunctionalDimensions)

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

| 参数 | 说明 | 可选值 |
|------|------|--------|
| storage_class | 存储类型 | STANDARD / GLACIER_IR |
| lifecycle_policy | 生命周期策略 | 启用/禁用，转换天数 |

### 价格维度 (PricingDimensions)

| 参数 | 说明 | 默认值 |
|------|------|--------|
| region | AWS 区域 | ap-northeast-1 |
| discount_percent | 折扣比例 | 0 (无折扣) |

## AWS 定价参考 (ap-northeast-1)

| 成本项 | S3 Standard | S3 Glacier IR |
|--------|-------------|---------------|
| 存储 | $0.025/GB | $0.004/GB |
| PUT 请求 | $0.0047/千次 | $0.02/千次 |
| GET 请求 | $0.00037/千次 | $0.01/千次 |
| GET 检索 | - | $0.03/GB |
| 生命周期转换 | - | $0.02/千次 |
| 数据传输出站 | $0.114/GB | 同左 |

## 项目结构

```
ipc-case-cost-evaluator/
├── backend/                      # 后端服务 (FastAPI)
│   ├── app/
│   │   ├── api/routes/           # API 路由
│   │   ├── core/                 # 核心配置
│   │   ├── db/                   # 数据层
│   │   ├── models/               # 数据模型
│   │   └── services/             # 业务服务
│   │       ├── calculator/       # 成本计算引擎
│   │       ├── auth.py           # 认证服务
│   │       └── excel_export.py   # Excel 导出
│   ├── tests/                    # 单元测试 (305+)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                     # 前端应用 (React + TypeScript)
│   ├── src/
│   │   ├── api/                  # API 客户端
│   │   ├── components/           # React 组件
│   │   ├── pages/                # 页面
│   │   └── types/                # 类型定义
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml            # 生产环境编排
├── docker-compose.dev.yml        # 开发环境编排
└── README.md
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| APP_ENV | 运行环境 | production |
| SECRET_KEY | JWT 密钥 | - |
| STORAGE_TYPE | 存储类型 | local |
| VITE_API_BASE_URL | API 地址 | /api/v1 |

## 测试

```bash
# 后端测试
cd backend
pytest tests/ -v

# 测试覆盖率
pytest tests/ --cov=app --cov-report=html
```

## 部署

### Docker 部署

```bash
# 生产环境
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动部署

1. 后端部署到支持 Python 的服务器
2. 前端构建后部署到 Nginx/CDN
3. 配置 Nginx 反向代理到后端 API

## License

MIT
