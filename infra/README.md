# IPC Cost Evaluator - AWS CDK 基础设施

AWS CDK TypeScript 项目，用于部署 IPC Case Cost Evaluator 的 Serverless 基础设施。

## 架构概览

```
                          ┌─────────────────────────────────────┐
                          │         CloudFront Distribution     │
                          │  (统一入口, HTTPS, 全球 CDN)         │
                          └───────────┬───────────┬─────────────┘
                                      │           │
                        /api/*        │           │  /*
                                      ▼           ▼
                 ┌────────────────────────┐ ┌─────────────────┐
                 │  API Gateway HTTP API  │ │   S3 Bucket     │
                 │  (Lambda 集成)          │ │   (私有, OAC)   │
                 └───────────┬────────────┘ └─────────────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │  Lambda (容器镜像)      │
                 │  FastAPI + Mangum      │
                 └───────────┬────────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │    DynamoDB Tables     │
                 │  (users, evaluations,  │
                 │   shares - 按需计费)   │
                 └────────────────────────┘
```

## 项目结构

```
infra/
├── bin/
│   └── app.ts                   # CDK 应用入口
├── lib/
│   ├── stacks/                  # CDK 栈定义
│   │   ├── database-stack.ts    # DynamoDB 表
│   │   ├── backend-stack.ts     # Lambda + API Gateway
│   │   └── frontend-stack.ts    # S3 + CloudFront
│   ├── constructs/              # 可复用构造
│   │   ├── fastapi-lambda.ts    # FastAPI Lambda 构造
│   │   ├── static-website.ts    # 静态网站构造
│   │   └── dynamodb-tables.ts   # DynamoDB 表构造
│   └── config/
│       └── environments.ts      # 环境配置
├── cdk.json                     # CDK 配置
├── tsconfig.json
└── package.json
```

## 快速开始

### 前置要求

- Node.js 18+
- AWS CLI 2.x (已配置凭证)
- AWS CDK CLI 2.x

### 安装

```bash
npm install
```

### 首次部署

```bash
# 1. Bootstrap CDK (每个账户/区域只需一次)
npm run bootstrap

# 2. 构建前端
cd ../frontend && npm install && npm run build && cd ../infra

# 3. 部署开发环境
npm run deploy:dev

# 4. 上传前端到 S3
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name IPCCostEvaluator-Dev-Frontend \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)
aws s3 sync ../frontend/dist/ s3://$BUCKET/ --delete
```

## 可用命令

### 部署命令

| 命令 | 描述 |
|------|------|
| `npm run deploy:dev` | 部署开发环境 (自动审批) |
| `npm run deploy:staging` | 部署预发布环境 (安全变更需审批) |
| `npm run deploy:prod` | 部署生产环境 (需审批) |

### 销毁命令

| 命令 | 描述 |
|------|------|
| `npm run destroy:dev` | 销毁开发环境 (自动确认) |
| `npm run destroy:staging` | 销毁预发布环境 (自动确认) |
| `npm run destroy:prod` | 销毁生产环境 (需手动确认) |

### 查看命令

| 命令 | 描述 |
|------|------|
| `npm run list:dev` | 列出开发环境栈 |
| `npm run diff:dev` | 预览开发环境变更 |
| `npm run synth:dev` | 生成 CloudFormation 模板 |

## 环境配置

### 开发环境 (dev)

- **用途**: 本地开发和功能测试
- **Lambda**: 512MB 内存
- **DynamoDB**: 销毁时删除，无 PITR
- **CORS**: 允许所有源

### 预发布环境 (staging)

- **用途**: 集成测试和验收测试
- **Lambda**: 1024MB 内存，50 预留并发
- **DynamoDB**: 销毁时删除，无 PITR
- **CORS**: 限制为 CloudFront 域名

### 生产环境 (prod)

- **用途**: 正式线上服务
- **Lambda**: 1024MB 内存，100 预留并发
- **DynamoDB**: 销毁时保留，启用 PITR
- **CORS**: 限制为 CloudFront 域名

## 栈输出

部署完成后，可通过以下方式查看输出：

```bash
# 查看所有输出
aws cloudformation describe-stacks \
  --stack-name IPCCostEvaluator-Dev-Frontend \
  --query 'Stacks[0].Outputs'
```

### Database Stack 输出
- `UsersTableName` - 用户表名称
- `EvaluationsTableName` - 评估表名称
- `SharesTableName` - 分享表名称

### Backend Stack 输出
- `ApiUrl` - API Gateway URL
- `LambdaFunctionName` - Lambda 函数名称
- `LambdaFunctionArn` - Lambda 函数 ARN

### Frontend Stack 输出
- `WebsiteUrl` - 网站 URL
- `BucketName` - S3 存储桶名称
- `DistributionId` - CloudFront 分发 ID

## 故障排查

### 部署失败

```bash
# 查看 CloudFormation 事件
aws cloudformation describe-stack-events \
  --stack-name IPCCostEvaluator-Dev-Backend \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'
```

### Lambda 冷启动慢

1. 增加内存 (`lib/config/environments.ts`)
2. 使用预置并发 (需额外配置)

### CloudFront 缓存问题

```bash
# 手动刷新缓存
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

## 相关文档

- [快速开始指南](../specs/003-aws-cdk-infra/quickstart.md)
- [技术规范](../specs/003-aws-cdk-infra/spec.md)
- [实现计划](../specs/003-aws-cdk-infra/plan.md)
