# Quickstart: IPC Case Cost Evaluator

快速开始指南，帮助开发者在 10 分钟内启动项目。

## 前置条件

- Python 3.11+
- Node.js 18+
- AWS 账户（可选，用于 DynamoDB 和 Pricing API）

## 后端启动

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境变量（可选）
export AWS_REGION=ap-northeast-1
export JWT_SECRET_KEY=your-secret-key-here
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15

# 5. 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

后端服务将在 http://localhost:8000 启动。

API 文档: http://localhost:8000/docs

## 前端启动

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:5173 启动。

## 快速验证

### 1. 健康检查

```bash
curl http://localhost:8000/health
# {"status": "healthy"}
```

### 2. 成本计算

```bash
curl -X POST http://localhost:8000/api/v1/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "functional": {
      "device_count": 100,
      "recording_mode": "event",
      "video_quality": "1080p",
      "events_per_day": 50,
      "event_duration_seconds": 30,
      "access_pattern": 0.1,
      "retention_days": 30
    },
    "technical": {
      "storage_class": "STANDARD"
    },
    "pricing": {
      "region": "ap-northeast-1"
    }
  }'
```

### 3. 方案对比

```bash
curl -X POST http://localhost:8000/api/v1/compare \
  -H "Content-Type: application/json" \
  -d '{
    "functional": {
      "device_count": 100,
      "recording_mode": "event",
      "video_quality": "1080p",
      "retention_days": 30
    },
    "pricing": {
      "region": "ap-northeast-1"
    }
  }'
```

### 4. 获取预设场景

```bash
curl http://localhost:8000/api/v1/scenarios
```

## 运行测试

### 后端测试

```bash
cd backend
pytest tests/ -v

# 运行特定测试
pytest tests/test_s3_standard.py -v

# 带覆盖率
pytest tests/ --cov=app --cov-report=html
```

### E2E 测试

```bash
cd frontend
npm run test:e2e
```

## 目录结构

```
.
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API 路由
│   │   ├── models/          # Pydantic 模型
│   │   ├── services/        # 业务逻辑
│   │   │   └── calculator/  # 成本计算引擎
│   │   ├── data/            # 静态数据
│   │   │   └── aws_pricing/ # AWS 定价 JSON
│   │   └── db/              # 数据库
│   └── tests/               # 测试
├── frontend/
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── pages/           # 页面
│   │   └── services/        # API 客户端
│   └── tests/               # E2E 测试
└── specs/                   # 规格文档
    └── 001-ipc-cost-evaluator/
        ├── spec.md          # 功能规格
        ├── plan.md          # 实现计划
        └── contracts/       # API 契约
```

## 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `AWS_REGION` | `ap-northeast-1` | AWS 区域 |
| `AWS_ACCESS_KEY_ID` | - | AWS 访问密钥 (可选) |
| `AWS_SECRET_ACCESS_KEY` | - | AWS 密钥 (可选) |
| `JWT_SECRET_KEY` | `dev-secret` | JWT 签名密钥 |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access Token 有效期 |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh Token 有效期 |
| `DYNAMODB_TABLE_PREFIX` | `ipc_` | DynamoDB 表前缀 |
| `USE_LOCAL_STORAGE` | `true` | 开发模式使用本地存储 |

## 开发模式

开发模式下，系统使用本地存储替代 DynamoDB：

```bash
export USE_LOCAL_STORAGE=true
```

本地存储文件位于 `backend/data/local_storage/`。

## 下一步

1. 阅读 [spec.md](./spec.md) 了解功能需求
2. 查看 [data-model.md](./data-model.md) 了解数据模型
3. 参考 [contracts/openapi.yaml](./contracts/openapi.yaml) 了解 API 契约
4. 运行 `/speckit.tasks` 生成实现任务
