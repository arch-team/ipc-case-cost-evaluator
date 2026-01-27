# Research: AWS CDK Serverless 基础设施

**Date**: 2026-01-27
**Feature Branch**: `003-aws-cdk-infra`

## 技术决策总结

### 1. FastAPI Lambda 部署模式

**Decision**: Lambda 容器镜像 + Mangum 适配器 + API Gateway HTTP API

**Rationale**:
- **容器镜像**优于 ZIP 打包：支持最大 10GB（vs ZIP 250MB），更好的依赖管理，与现有 Dockerfile 复用
- **Mangum** 是 FastAPI 最成熟的 Lambda 适配器，性能优秀，社区活跃
- **HTTP API** 比 REST API 成本低约 70%，延迟低约 50%，功能满足需求

**Alternatives Considered**:
- Lambda Layer + ZIP：依赖管理复杂，包大小限制
- AWS Lambda Powertools：功能更强但学习曲线陡峭
- REST API：功能更全但成本高，本项目不需要 API 密钥管理等高级功能

**Lambda 配置**:
- 内存: 1024MB（FastAPI 推荐值，平衡性能和成本）
- 超时: 30 秒（覆盖大多数 API 请求场景）
- 架构: ARM64（比 x86 便宜约 20%）
- Lifespan: off（关闭生命周期事件以提高冷启动性能）

### 2. 前端静态网站部署

**Decision**: S3（私有桶）+ CloudFront OAC + CloudFront 函数处理 SPA 路由

**Rationale**:
- **私有 S3 桶 + OAC**：最安全的配置，仅允许 CloudFront 访问
- **CloudFront 函数**：处理 SPA 路由（非文件请求重写为 /index.html），比 Lambda@Edge 便宜 6 倍
- **HTTP/2+3 支持**：提升加载性能

**Alternatives Considered**:
- S3 静态网站托管（公开）：安全性较低
- Lambda@Edge：成本较高，延迟较大
- Amplify Hosting：功能更全但灵活性较低

**缓存策略**:
- 静态资源 (JS/CSS/图片): 24 小时默认 TTL，最长 365 天
- HTML: 0 秒最小 TTL（确保及时更新）
- API: 禁用缓存

### 3. CloudFront 多源站配置

**Decision**: 统一 CloudFront Distribution，路径模式区分前后端

**Rationale**:
- 单一入口点简化 DNS 和证书管理
- 路径模式清晰：`/api/*` → API Gateway，其他 → S3
- CORS 由 API Gateway 处理，CloudFront 透传

**路径配置**:
```
默认行为 (/*): S3 前端资源
API 行为 (/api/*): API Gateway HTTP API
```

**Origin Request Policy**:
- API 路径: 透传 Accept, Content-Type, Authorization 头部
- 静态资源: 无头部透传，使用默认缓存

### 4. CDK 项目结构

**Decision**: 在当前仓库 `infra/` 子目录，使用 TypeScript

**Rationale**:
- TypeScript 提供类型安全和更好的 IDE 支持
- 子目录便于统一版本管理，应用代码和基础设施保持同步
- 模块化结构（stacks + constructs）便于测试和复用

**目录结构**:
```
infra/
├── bin/
│   └── app.ts                # CDK 应用入口
├── lib/
│   ├── stacks/               # 栈定义
│   │   ├── database-stack.ts
│   │   ├── backend-stack.ts
│   │   └── frontend-stack.ts
│   ├── constructs/           # 可复用构造
│   │   ├── fastapi-lambda.ts
│   │   ├── static-website.ts
│   │   └── dynamodb-tables.ts
│   └── config/
│       └── environments.ts   # 环境配置
├── test/                     # CDK 测试
├── cdk.json
└── package.json
```

### 5. 多环境配置管理

**Decision**: TypeScript 环境配置对象 + CDK Context 切换

**Rationale**:
- TypeScript 接口确保类型安全
- 配置集中管理，避免分散在多个文件
- CDK Context 支持命令行切换环境

**环境配置项**:
- account/region
- Lambda 内存/超时
- DynamoDB RemovalPolicy
- CORS 允许源
- 监控启用状态

**部署命令示例**:
```bash
# 开发环境
cdk deploy --context environment=dev

# 生产环境
cdk deploy --context environment=prod
```

### 6. DynamoDB 配置

**Decision**: 按需计费 (PAY_PER_REQUEST) + 环境感知 RemovalPolicy

**Rationale**:
- **按需计费**：适合不可预测的流量，无需预估容量
- **RemovalPolicy**：dev/test 使用 DESTROY，prod 使用 RETAIN 保护数据

**表设计**:
| 表名 | 分区键 | 排序键 | 特殊配置 |
|------|--------|--------|----------|
| users | username | - | email GSI |
| evaluations | user_id | evaluation_id | created_at LSI, TTL |
| shares | share_id | - | user_id GSI, TTL |

**安全配置**:
- 默认 AWS 托管加密
- 生产环境启用 PITR（时间点恢复）

### 7. IAM 最小权限策略

**Decision**: CDK 自动生成 + 手动收紧敏感操作

**Rationale**:
- CDK 自动为 Lambda 生成执行角色
- 使用 `grantRead/grantWrite` 方法自动配置 DynamoDB 权限
- 避免使用通配符权限

**Lambda 权限**:
- DynamoDB: 仅 CRUD 操作
- CloudWatch Logs: 自动创建日志组
- 无 S3、SES 等其他服务权限

## 依赖版本

```json
{
  "aws-cdk-lib": "^2.120.0",
  "constructs": "^10.3.0",
  "@aws-cdk/aws-apigatewayv2-alpha": "^2.120.0-alpha.0",
  "@aws-cdk/aws-apigatewayv2-integrations-alpha": "^2.120.0-alpha.0"
}
```

## 参考资料

- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
- [Mangum - ASGI adapter for AWS Lambda](https://mangum.io/)
- [CloudFront Functions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html)
- [API Gateway HTTP API vs REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
