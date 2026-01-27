# Quickstart: AWS CDK 部署指南

**Date**: 2026-01-27
**Feature Branch**: `003-aws-cdk-infra`

## 前置要求

### 必需软件
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- AWS CLI 2.x (`aws --version`)
- AWS CDK CLI 2.x (`cdk --version`)

### AWS 配置
1. 拥有 AWS 账户
2. 配置 AWS 凭证：
   ```bash
   aws configure
   # 输入 Access Key ID、Secret Access Key、Region (us-east-1)
   ```

## 快速开始

### Step 1: 安装依赖

```bash
# 进入 CDK 项目目录
cd infra

# 安装依赖
npm install
```

### Step 2: Bootstrap CDK（首次使用）

```bash
# 初始化 CDK 环境（每个账户/区域只需执行一次）
npx cdk bootstrap
```

### Step 3: 构建应用

在部署前，需要构建前端和准备后端 Docker 镜像：

```bash
# 构建前端
cd ../frontend
npm install
npm run build

# 返回 CDK 目录
cd ../infra
```

### Step 4: 部署

```bash
# 部署开发环境
npm run deploy:dev

# 或直接使用 CDK 命令
npx cdk deploy --all --context environment=dev
```

### Step 5: 验证部署

部署完成后，控制台会输出：

```
Outputs:
IPCCostEvaluator-Frontend-dev.FrontendUrl = https://d1234.cloudfront.net
IPCCostEvaluator-Backend-dev.ApiUrl = https://abc123.execute-api.us-east-1.amazonaws.com
```

访问 `FrontendUrl` 验证应用是否正常运行。

## 常用命令

| 命令 | 描述 |
|------|------|
| `npm run deploy:dev` | 部署到开发环境 |
| `npm run deploy:prod` | 部署到生产环境（需审批） |
| `npm run destroy:dev` | 销毁开发环境 |
| `npm run diff:dev` | 查看待部署变更 |
| `npx cdk list` | 列出所有栈 |
| `npx cdk synth` | 生成 CloudFormation 模板 |

## 多环境部署

### 开发环境
```bash
npx cdk deploy --all --context environment=dev
```
- DynamoDB: 销毁时删除
- Lambda: 512MB 内存
- 无告警

### 生产环境
```bash
npx cdk deploy --all --context environment=prod --require-approval broadening
```
- DynamoDB: 销毁时保留
- Lambda: 1024MB 内存
- 启用 PITR

## 故障排查

### CDK Bootstrap 失败
```bash
# 检查 AWS 凭证
aws sts get-caller-identity

# 手动指定账户和区域
npx cdk bootstrap aws://123456789012/us-east-1
```

### 部署超时
- 检查 CloudFormation 事件：AWS Console → CloudFormation → Events
- 常见原因：资源配额限制、IAM 权限不足

### Lambda 冷启动慢
- 增加 Lambda 内存（在 `lib/config/environments.ts` 中配置）
- 使用预置并发（付费功能）

### CloudFront 更新慢
- CloudFront 分发更新需要 5-15 分钟
- 使用 `cdk diff` 先预览变更

## 清理资源

```bash
# 销毁开发环境（包括数据）
npm run destroy:dev

# 销毁生产环境（DynamoDB 表保留）
npx cdk destroy --all --context environment=prod
```

**注意**: 生产环境的 DynamoDB 表需要手动删除（安全保护）。

## 下一步

- 配置自定义域名和 SSL 证书
- 设置 CI/CD 自动部署
- 添加监控告警
