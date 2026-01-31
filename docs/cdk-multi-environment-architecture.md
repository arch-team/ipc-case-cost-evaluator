# IPC Cost Evaluator CDK 多环境架构分析

## 概述

本项目的 `infra/` 目录采用 **配置即代码 (Configuration as Code)** 模式，通过统一的配置接口实现 dev/staging/prod 三种云环境的一致性，同时后端支持本地开发环境的无缝切换。

---

## 1. 多环境配置架构

### 1.1 核心配置文件：`lib/config/environments.ts`

```
infra/
├── bin/app.ts                          # CDK 入口，读取环境配置
├── lib/
│   ├── config/
│   │   └── environments.ts             # 核心：三环境配置定义
│   ├── stacks/
│   │   ├── database-stack.ts           # DynamoDB 栈
│   │   ├── backend-stack.ts            # Lambda + API Gateway 栈
│   │   └── frontend-stack.ts           # S3 + CloudFront 栈
│   └── constructs/
│       ├── dynamodb-tables.ts          # DynamoDB 构造
│       ├── fastapi-lambda.ts           # Lambda 构造
│       └── static-website.ts           # 静态网站构造
└── package.json                        # 多环境命令
```

### 1.2 配置接口设计

```typescript
// environments.ts:16-59
export interface EnvironmentConfig {
  envName: 'dev' | 'staging' | 'prod';
  region: string;
  appPrefix: string;                     // 资源命名前缀
  stackPrefix: string;                   // CloudFormation 栈前缀
  removalPolicy: cdk.RemovalPolicy;      // 删除策略
  dynamodb: {
    tablePrefix: string;
    pointInTimeRecovery: boolean;        // PITR 备份
  };
  lambda: {
    memorySize: number;
    timeout: number;
    reservedConcurrency?: number;
    environment: Record<string, string>; // Lambda 环境变量
  };
  cloudfront: { priceClass: string; enableLogging: boolean; };
  apiGateway: { corsAllowOrigins: string[]; };
  tags: Record<string, string>;
}
```

---

## 2. 三种云环境对比

| 配置维度 | Dev | Staging | Prod |
|---------|-----|---------|------|
| **资源前缀** | `ipc-cost-dev` | `ipc-cost-staging` | `ipc-cost-prod` |
| **删除策略** | DESTROY (可删除) | DESTROY | **RETAIN** (保留数据) |
| **Lambda 内存** | 512MB | 1024MB | 1024MB |
| **Lambda 并发** | 无限制 | 50 | 100 |
| **DynamoDB PITR** | 否 | 否 | **是** (时间点恢复) |
| **CloudFront 日志** | 否 | 是 | 是 |
| **CloudFront 价格** | PriceClass_100 | PriceClass_100 | PriceClass_200 |
| **日志级别** | DEBUG | INFO | INFO |
| **JWT 密钥** | 固定开发密钥 | 环境变量 | 环境变量 (必须) |

---

## 3. 环境切换机制

### 3.1 CDK Context 参数

```bash
# 通过 -c environment=xxx 切换环境
cdk synth -c environment=dev      # 开发环境
cdk synth -c environment=staging  # 预发布环境
cdk synth -c environment=prod     # 生产环境
```

### 3.2 配置获取流程

```
npm run deploy:prod
    ↓
cdk deploy -c environment=prod
    ↓
bin/app.ts 执行
    ↓
getConfigFromContext(app)
    ↓
app.node.tryGetContext('environment') → 'prod'
    ↓
getConfig('prod') → prodConfig
    ↓
传递给各个 Stack 和 Construct
```

### 3.3 package.json 命令

```json
{
  "synth:dev": "cdk synth -c environment=dev",
  "synth:prod": "cdk synth -c environment=prod",
  "deploy:dev": "cdk deploy --all -c environment=dev --require-approval never",
  "deploy:staging": "cdk deploy --all -c environment=staging --require-approval broadening",
  "deploy:prod": "cdk deploy --all -c environment=prod",
  "destroy:dev": "cdk destroy --all -c environment=dev --force"
}
```

**审批策略差异**:
- Dev: `--require-approval never` → 无需审批
- Staging: `--require-approval broadening` → 安全组变更需审批
- Prod: 默认 → 所有变更需审批

---

## 4. 本地开发环境支持

### 4.1 后端存储抽象层

后端通过 `STORAGE_TYPE` 环境变量支持本地/云存储切换：

```python
# backend/app/core/config.py:39-45
STORAGE_TYPE: str = "local"  # 默认本地存储

@property
def use_local_storage(self) -> bool:
    return self.STORAGE_TYPE.lower() != "dynamodb"
```

```python
# backend/app/db/client.py:56-59
def get_storage() -> StorageProtocol:
    if settings.use_local_storage:
        return LocalStorage()      # 本地 JSON 文件存储
    else:
        return DynamoDBClient()    # AWS DynamoDB
```

### 4.2 本地开发 vs 云部署差异

| 维度 | 本地开发 | 云部署 (Lambda) |
|------|---------|----------------|
| **存储后端** | `LocalStorage` (JSON 文件) | `DynamoDBClient` |
| **环境变量 `STORAGE_TYPE`** | `local` (默认) | `dynamodb` (CDK 注入) |
| **运行方式** | `uvicorn app.main:app` | Lambda + Mangum |
| **API 访问** | `http://localhost:8000` | API Gateway URL |
| **前端访问** | `http://localhost:5173` | CloudFront URL |

### 4.3 本地开发启动命令

```bash
# 后端 (本地存储，无需 AWS 凭证)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000/docs

# 前端 (连接本地后端)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 5. 一致性保证机制

### 5.1 命名规范统一

```
资源命名模式: {appPrefix}-{resourceType}
表名模式: {tablePrefix}-{tableName}
栈名模式: {stackPrefix}-{StackType}

例如 Dev 环境:
  Lambda: ipc-cost-dev-api
  S3: ipc-cost-dev-website-{account}
  表: ipc-cost-dev-users, ipc-cost-dev-evaluations
  栈: IPCCostEvaluator-Dev-Database
```

### 5.2 配置传播链

```
environments.ts (配置定义)
    ↓
bin/app.ts (读取配置)
    ↓
Stack (接收 config 参数)
    ↓
Construct (使用 config 属性)
    ↓
AWS 资源 (应用配置值)
```

### 5.3 Construct 配置使用示例

```typescript
// dynamodb-tables.ts
constructor(scope: Construct, id: string, props: { config: EnvironmentConfig }) {
  const { config } = props;

  this.usersTable = new dynamodb.Table(this, 'UsersTable', {
    tableName: `${config.dynamodb.tablePrefix}-users`,      // 前缀化
    removalPolicy: config.removalPolicy,                     // 环境特定
    pointInTimeRecoverySpecification: {
      pointInTimeRecoveryEnabled: config.dynamodb.pointInTimeRecovery,  // 生产启用
    },
  });
}
```

---

## 6. 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                    配置层 (environments.ts)                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                       │
│  │ devConfig│    │stagingCfg│    │ prodConfig│                       │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘                       │
│       │               │               │                              │
│       └───────────────┼───────────────┘                              │
│                       ↓                                              │
│              getConfigFromContext()                                  │
│                       ↓                                              │
└───────────────────────┼──────────────────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────────────────┐
│                    栈层 (Stacks)                                     │
│  ┌────────────────┐ → ┌────────────────┐ → ┌────────────────┐       │
│  │ DatabaseStack  │   │ BackendStack   │   │ FrontendStack  │       │
│  │ (DynamoDB)     │   │ (Lambda+API GW)│   │ (S3+CloudFront)│       │
│  └───────┬────────┘   └───────┬────────┘   └───────┬────────┘       │
│          │                    │                    │                 │
└──────────┼────────────────────┼────────────────────┼─────────────────┘
           │                    │                    │
┌──────────┼────────────────────┼────────────────────┼─────────────────┐
│                    构造层 (Constructs)                               │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐       │
│  │ DynamoDBTables │   │ FastApiLambda  │   │ StaticWebsite  │       │
│  │ config.dynamodb│   │ config.lambda  │   │ config.cloudfront     │
│  └────────────────┘   └────────────────┘   └────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. 关键代码路径

| 功能 | 文件路径 |
|------|---------|
| 环境配置定义 | `infra/lib/config/environments.ts:16-59` |
| 配置获取函数 | `infra/lib/config/environments.ts:216-218` |
| CDK 入口 | `infra/bin/app.ts` |
| DynamoDB 构造 | `infra/lib/constructs/dynamodb-tables.ts` |
| Lambda 构造 | `infra/lib/constructs/fastapi-lambda.ts` |
| 静态网站构造 | `infra/lib/constructs/static-website.ts` |
| 后端存储切换 | `backend/app/db/client.py:56-59` |
| 后端配置 | `backend/app/core/config.py:39-45` |

---

## 总结

该项目通过以下机制保证多环境功能一致性：

1. **统一配置接口** - `EnvironmentConfig` 定义所有环境参数
2. **前缀化命名** - 资源通过 `appPrefix`/`tablePrefix`/`stackPrefix` 隔离
3. **配置传播** - 从入口点到每个 Construct 层层传递配置
4. **存储抽象** - 后端通过 `StorageProtocol` 支持本地/云存储切换
5. **命令封装** - `package.json` 脚本封装环境切换逻辑
