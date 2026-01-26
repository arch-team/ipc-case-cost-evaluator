# 开发贡献指南

本文档为 IPC Case Cost Evaluator 项目的开发贡献指南。

## 环境要求

- **Python**: 3.11+
- **Node.js**: 18+
- **包管理器**: pip, npm/yarn

## 环境设置

### 1. 克隆仓库

```bash
git clone <repository-url>
cd ipc-case-cost-evaluator
```

### 2. 后端环境配置

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
# Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

### 3. 前端环境配置

```bash
cd frontend
npm install
```

### 4. 环境变量配置

复制 `.env.example` 到 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `APP_ENV` | `production` | 应用环境 (development/production) |
| `SECRET_KEY` | - | 安全密钥 (**生产环境必须修改**) |
| `STORAGE_TYPE` | `local` | 存储类型: `local` / `dynamodb` |
| `AWS_REGION` | `ap-northeast-1` | AWS 区域 (使用 DynamoDB 时) |
| `DYNAMODB_USERS_TABLE` | `ipc-cost-users` | DynamoDB 用户表名 |
| `DYNAMODB_EVALUATIONS_TABLE` | `ipc-cost-evaluations` | DynamoDB 评估表名 |

## 开发工作流

### 后端开发

```bash
cd backend
source .venv/bin/activate

# 启动开发服务器 (热重载)
uvicorn app.main:app --reload

# API 文档
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

### 前端开发

```bash
cd frontend

# 启动开发服务器
npm run dev

# 预览生产构建
npm run preview

# 构建生产版本
npm run build
```

## 可用脚本

### 前端脚本 (frontend/package.json)

| 脚本 | 命令 | 说明 |
|------|------|------|
| `dev` | `vite` | 启动开发服务器 |
| `build` | `tsc -b && vite build` | TypeScript 编译并构建生产版本 |
| `lint` | `eslint .` | 运行 ESLint 代码检查 |
| `preview` | `vite preview` | 预览生产构建 |
| `test:e2e` | `playwright test` | 运行 E2E 测试 |
| `test:e2e:ui` | `playwright test --ui` | UI 模式运行 E2E 测试 |
| `test:e2e:headed` | `playwright test --headed` | 有头模式运行 E2E 测试 |
| `test:e2e:debug` | `playwright test --debug` | 调试模式运行 E2E 测试 |

### 后端测试

```bash
cd backend
source .venv/bin/activate

# 运行所有测试
pytest tests/ -v

# 运行单个测试文件
pytest tests/test_s3_standard.py -v

# 运行单个测试函数
pytest tests/test_s3_standard.py::test_basic_cost -v

# 运行测试并显示覆盖率
pytest tests/ -v --cov=app --cov-report=html
```

## 代码规范

### Python (后端)

- 遵循 PEP 8 规范
- 使用 Type Hints
- Docstring 使用 Google 风格

### TypeScript (前端)

- 运行 `npm run lint` 确保代码符合 ESLint 规则
- 使用 TypeScript 严格模式

## 依赖管理

### 后端依赖 (requirements.txt)

**生产依赖:**
- `fastapi>=0.109.0` - Web 框架
- `uvicorn>=0.27.0` - ASGI 服务器
- `openpyxl>=3.1.2` - Excel 导出
- `boto3>=1.34.0` - AWS SDK
- `python-jose[cryptography]>=3.3.0` - JWT 认证
- `passlib[bcrypt]>=1.7.4` - 密码哈希
- `pydantic>=2.5.0` - 数据验证
- `pydantic-settings>=2.1.0` - 配置管理

**测试依赖:**
- `pytest>=8.0.0` - 测试框架
- `pytest-asyncio>=0.23.0` - 异步测试
- `httpx>=0.26.0` - HTTP 客户端测试
- `moto[dynamodb]>=5.0.0` - AWS 模拟

### 添加新依赖

```bash
# 后端
pip install <package>
pip freeze > requirements.txt  # 更新依赖文件

# 前端
npm install <package>
```

## Git 工作流

### 分支命名

- `feature/<功能名>` - 新功能
- `fix/<问题描述>` - Bug 修复
- `docs/<文档名>` - 文档更新

### 提交信息格式

```
<类型>: <简短描述>

<详细说明>
```

类型包括: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 项目结构

```
ipc-case-cost-evaluator/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── models/              # Pydantic 模型
│   │   ├── services/            # 业务逻辑
│   │   │   └── calculator/      # 成本计算引擎
│   │   └── data/                # 静态数据
│   │       └── aws_pricing/     # AWS 定价数据
│   ├── tests/                   # 测试文件
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── e2e/                     # E2E 测试
│   └── package.json
└── docs/                        # 项目文档
```

## 常见问题

### Q: 如何切换存储后端?

修改 `.env` 中的 `STORAGE_TYPE`:
- `local`: 使用本地文件存储 (开发环境)
- `dynamodb`: 使用 AWS DynamoDB (生产环境)

### Q: 如何更新 AWS 定价数据?

编辑 `backend/app/data/aws_pricing/` 目录下的 JSON 文件。

### Q: E2E 测试失败怎么办?

1. 确保前后端服务都在运行
2. 使用 `npm run test:e2e:debug` 调试模式查看详细信息
