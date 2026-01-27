# CDK 命令接口合约

**Date**: 2026-01-27
**Feature Branch**: `003-aws-cdk-infra`

## 核心命令

### 1. 部署命令

#### 完整部署
```bash
# 部署到开发环境（默认）
cd infra && npx cdk deploy --all

# 部署到指定环境
cd infra && npx cdk deploy --all --context environment=prod

# 部署单个栈
cd infra && npx cdk deploy IPCCostEvaluator-Backend-dev
```

**参数**:
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| --context environment | string | dev | 目标环境 (dev/staging/prod) |
| --all | flag | - | 部署所有栈 |
| --require-approval | string | broadening | 权限变更审批级别 |

**输出**:
```
✅ IPCCostEvaluator-Database-dev
✅ IPCCostEvaluator-Backend-dev
✅ IPCCostEvaluator-Frontend-dev

Outputs:
IPCCostEvaluator-Frontend-dev.FrontendUrl = https://d1234.cloudfront.net
IPCCostEvaluator-Backend-dev.ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com
```

**错误码**:
| 代码 | 含义 |
|------|------|
| 0 | 成功 |
| 1 | 部署失败（查看 CloudFormation 事件）|
| 2 | 参数验证失败 |

### 2. 销毁命令

```bash
# 销毁指定环境的所有资源
cd infra && npx cdk destroy --all --context environment=dev

# 强制销毁（跳过确认）
cd infra && npx cdk destroy --all --context environment=dev --force
```

**参数**:
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| --context environment | string | dev | 目标环境 |
| --force | flag | false | 跳过确认提示 |

**行为**:
- dev/staging 环境：删除所有资源包括 DynamoDB 数据
- prod 环境：DynamoDB 表保留，其他资源删除

### 3. 状态查看命令

#### 查看栈列表
```bash
cd infra && npx cdk list --context environment=dev
```

**输出**:
```
IPCCostEvaluator-Database-dev
IPCCostEvaluator-Backend-dev
IPCCostEvaluator-Frontend-dev
```

#### 查看变更差异
```bash
cd infra && npx cdk diff --all --context environment=dev
```

**输出**:
```
Stack IPCCostEvaluator-Backend-dev
Resources
[~] AWS::Lambda::Function BackendFunction/Resource BackendFunctionXXX
 └─ [~] MemorySize
     ├─ [-] 512
     └─ [+] 1024
```

#### 查看栈输出
```bash
aws cloudformation describe-stacks \
  --stack-name IPCCostEvaluator-Frontend-dev \
  --query 'Stacks[0].Outputs'
```

### 4. 合成命令（生成 CloudFormation 模板）

```bash
cd infra && npx cdk synth --context environment=dev
```

**输出目录**: `infra/cdk.out/`

## 环境配置 API

### 环境变量

| 变量名 | 必需 | 描述 |
|--------|------|------|
| CDK_DEFAULT_ACCOUNT | 是 | AWS 账户 ID |
| CDK_DEFAULT_REGION | 是 | AWS 区域 |
| AWS_ACCESS_KEY_ID | 是 | AWS 访问密钥 |
| AWS_SECRET_ACCESS_KEY | 是 | AWS 密钥 |

### CDK Context 配置

在 `cdk.json` 中配置：

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021": true,
    "environment": "dev"
  }
}
```

## 初始化流程

### Bootstrap（首次使用需执行）

```bash
# 初始化 CDK 环境（每个账户/区域只需执行一次）
cd infra && npx cdk bootstrap aws://{ACCOUNT}/{REGION}
```

### 依赖安装

```bash
cd infra && npm install
```

## 快速参考

```bash
# 开发环境一键部署
cd infra && npm run deploy:dev

# 生产环境部署
cd infra && npm run deploy:prod

# 销毁开发环境
cd infra && npm run destroy:dev

# 查看变更
cd infra && npm run diff:dev
```

### package.json scripts

```json
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "cdk": "cdk",
    "deploy:dev": "cdk deploy --all --context environment=dev",
    "deploy:staging": "cdk deploy --all --context environment=staging",
    "deploy:prod": "cdk deploy --all --context environment=prod --require-approval broadening",
    "destroy:dev": "cdk destroy --all --context environment=dev --force",
    "destroy:staging": "cdk destroy --all --context environment=staging --force",
    "diff:dev": "cdk diff --all --context environment=dev",
    "diff:prod": "cdk diff --all --context environment=prod",
    "synth": "cdk synth"
  }
}
```
