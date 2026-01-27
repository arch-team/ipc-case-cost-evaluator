# Data Model: AWS CDK 基础设施

**Date**: 2026-01-27
**Feature Branch**: `003-aws-cdk-infra`

## CDK 资源实体模型

### 1. 环境配置 (EnvironmentConfig)

表示每个部署环境的配置集合。

```typescript
interface EnvironmentConfig {
  // 基础配置
  account: string;              // AWS 账户 ID
  region: string;               // 部署区域，默认 us-east-1
  environmentName: string;      // 环境名称: dev | staging | prod

  // 应用配置
  app: {
    lambdaMemory: number;       // Lambda 内存 (MB)，默认 1024
    lambdaTimeout: number;      // Lambda 超时 (秒)，默认 30
    corsOrigins: string[];      // CORS 允许源
  };

  // 数据库配置
  database: {
    billingMode: 'PAY_PER_REQUEST';  // 固定按需计费
    removalPolicy: 'DESTROY' | 'RETAIN';
    enablePitr: boolean;        // 时间点恢复，prod 启用
  };

  // 监控配置
  monitoring: {
    enableLogs: boolean;        // 默认 true（AWS 默认日志）
  };
}
```

**验证规则**:
- `environmentName` 必须是 dev/staging/prod 之一
- `lambdaMemory` 范围: 128-10240 MB
- `lambdaTimeout` 范围: 1-900 秒
- `region` 必须是有效的 AWS 区域代码

### 2. CDK Stack 实体

#### DatabaseStack
```typescript
interface DatabaseStackProps {
  config: EnvironmentConfig;
}

interface DatabaseStackOutputs {
  usersTableArn: string;
  usersTableName: string;
  evaluationsTableArn: string;
  evaluationsTableName: string;
  sharesTableArn: string;
  sharesTableName: string;
}
```

#### BackendStack
```typescript
interface BackendStackProps {
  config: EnvironmentConfig;
  tables: {
    usersTable: ITable;
    evaluationsTable: ITable;
    sharesTable: ITable;
  };
}

interface BackendStackOutputs {
  apiUrl: string;              // API Gateway 端点 URL
  lambdaArn: string;           // Lambda 函数 ARN
  lambdaFunctionName: string;
}
```

#### FrontendStack
```typescript
interface FrontendStackProps {
  config: EnvironmentConfig;
  apiUrl: string;              // 来自 BackendStack
}

interface FrontendStackOutputs {
  distributionUrl: string;     // CloudFront 分发 URL
  distributionId: string;
  bucketName: string;
}
```

### 3. DynamoDB 表结构

继承现有应用的表设计：

#### Users 表
| 属性 | 类型 | 约束 |
|------|------|------|
| username | String | PK |
| email | String | GSI PK |
| hashed_password | String | Required |
| role | String | Enum: user/admin |
| is_active | Boolean | Default: true |
| created_at | Number | Epoch timestamp |
| updated_at | Number | Epoch timestamp |

#### Evaluations 表
| 属性 | 类型 | 约束 |
|------|------|------|
| user_id | String | PK |
| evaluation_id | String | SK |
| name | String | Required |
| input_data | Map | CostCalculationInput JSON |
| result_data | Map | CostSummary JSON |
| created_at | Number | LSI SK, Epoch timestamp |
| updated_at | Number | Epoch timestamp |
| expiry_time | Number | TTL, Optional |

#### Shares 表
| 属性 | 类型 | 约束 |
|------|------|------|
| share_id | String | PK |
| user_id | String | GSI PK |
| evaluation_id | String | Required |
| created_at | Number | GSI SK, Epoch timestamp |
| expires_at | Number | Required |
| expiry_time | Number | TTL |
| access_count | Number | Default: 0 |

## 资源命名规范

所有资源名称遵循统一前缀规则：

```
ipc-cost-evaluator-{environment}-{resource-type}
```

### 示例

| 资源类型 | dev 环境 | prod 环境 |
|----------|----------|-----------|
| DynamoDB Users | ipc-cost-evaluator-dev-users | ipc-cost-evaluator-prod-users |
| Lambda Function | ipc-cost-evaluator-dev-api | ipc-cost-evaluator-prod-api |
| S3 Bucket | ipc-cost-evaluator-dev-web | ipc-cost-evaluator-prod-web |
| CloudFront | (自动生成 ID) | (自动生成 ID) |
| API Gateway | ipc-cost-evaluator-dev-api | ipc-cost-evaluator-prod-api |

### CDK Stack 命名

```
IPCCostEvaluator-{Stack}-{Environment}
```

示例：
- `IPCCostEvaluator-Database-dev`
- `IPCCostEvaluator-Backend-prod`
- `IPCCostEvaluator-Frontend-staging`

## 状态转换

### 部署状态
```
PENDING → IN_PROGRESS → COMPLETE
                     ↘ FAILED → ROLLBACK_IN_PROGRESS → ROLLBACK_COMPLETE
```

### 销毁状态
```
DELETE_IN_PROGRESS → DELETE_COMPLETE
                   ↘ DELETE_FAILED
```

## 依赖关系图

```
                    ┌─────────────────┐
                    │ DatabaseStack   │
                    │ (DynamoDB 表)   │
                    └────────┬────────┘
                             │
                             │ tables
                             ▼
                    ┌─────────────────┐
                    │ BackendStack    │
                    │ (Lambda + API)  │
                    └────────┬────────┘
                             │
                             │ apiUrl
                             ▼
                    ┌─────────────────┐
                    │ FrontendStack   │
                    │ (S3 + CF)       │
                    └─────────────────┘
```

## CDK Outputs

部署完成后导出的关键信息：

| Output Key | 描述 | 示例值 |
|------------|------|--------|
| FrontendUrl | CloudFront 分发 URL | https://d1234.cloudfront.net |
| ApiUrl | API Gateway 端点 | https://abc123.execute-api.us-east-1.amazonaws.com |
| UsersTableName | 用户表名 | ipc-cost-evaluator-dev-users |
| LambdaFunctionName | Lambda 函数名 | ipc-cost-evaluator-dev-api |
