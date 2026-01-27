#!/usr/bin/env node
/**
 * CDK 应用入口点
 * 创建并组织所有基础设施栈
 *
 * 栈命名规范: {stackPrefix}-{StackType}
 * 例如: IPCCostEvaluator-Dev-Database, IPCCostEvaluator-Prod-Backend
 *
 * 使用方法:
 *   cdk deploy -c environment=dev    # 部署开发环境
 *   cdk deploy -c environment=staging # 部署预发布环境
 *   cdk deploy -c environment=prod   # 部署生产环境
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfigFromContext, getAvailableEnvironments } from '../lib/config/environments';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { BackendStack } from '../lib/stacks/backend-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

// 创建 CDK 应用
const app = new cdk.App();

// 获取环境配置
const config = getConfigFromContext(app);

console.log(`[CDK] ========================================`);
console.log(`[CDK] 部署环境: ${config.envName}`);
console.log(`[CDK] 区域: ${config.region}`);
console.log(`[CDK] 栈前缀: ${config.stackPrefix}`);
console.log(`[CDK] 资源前缀: ${config.appPrefix}`);
console.log(`[CDK] 可用环境: ${getAvailableEnvironments().join(', ')}`);
console.log(`[CDK] ========================================`);

// Stack 环境配置
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

// ========================================
// Stack 1: Database (DynamoDB 表)
// 栈名: IPCCostEvaluator-{Env}-Database
// ========================================

const databaseStack = new DatabaseStack(app, `${config.stackPrefix}-Database`, {
  config,
  env,
  description: `IPC Cost Evaluator - DynamoDB Tables (${config.envName})`,
});

// ========================================
// Stack 2: Backend (Lambda + API Gateway)
// 栈名: IPCCostEvaluator-{Env}-Backend
// ========================================

const backendStack = new BackendStack(app, `${config.stackPrefix}-Backend`, {
  config,
  env,
  description: `IPC Cost Evaluator - FastAPI Lambda + API Gateway (${config.envName})`,
  tables: {
    usersTable: databaseStack.tables.usersTable,
    evaluationsTable: databaseStack.tables.evaluationsTable,
    sharesTable: databaseStack.tables.sharesTable,
  },
});

// Backend 依赖 Database
backendStack.addDependency(databaseStack);

// ========================================
// Stack 3: Frontend (S3 + CloudFront)
// 栈名: IPCCostEvaluator-{Env}-Frontend
// ========================================

const frontendStack = new FrontendStack(app, `${config.stackPrefix}-Frontend`, {
  config,
  env,
  description: `IPC Cost Evaluator - S3 Static Website + CloudFront (${config.envName})`,
  apiUrl: backendStack.api.apiUrl,
});

// Frontend 依赖 Backend
frontendStack.addDependency(backendStack);

// ========================================
// 应用级别标签
// ========================================

cdk.Tags.of(app).add('Application', 'ipc-case-cost-evaluator');
cdk.Tags.of(app).add('Environment', config.envName);
cdk.Tags.of(app).add('StackPrefix', config.stackPrefix);
