#!/usr/bin/env node
/**
 * CDK 应用入口点
 * 创建并组织所有基础设施栈
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfigFromContext } from '../lib/config/environments';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { BackendStack } from '../lib/stacks/backend-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

// 创建 CDK 应用
const app = new cdk.App();

// 获取环境配置
const config = getConfigFromContext(app);

console.log(`[CDK] 部署环境: ${config.envName}`);
console.log(`[CDK] 区域: ${config.region}`);
console.log(`[CDK] 应用前缀: ${config.appPrefix}`);

// Stack 环境配置
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

// ========================================
// Stack 1: Database (DynamoDB 表)
// ========================================

const databaseStack = new DatabaseStack(app, `${config.appPrefix}-database`, {
  config,
  env,
  description: 'IPC Cost Evaluator - DynamoDB Tables',
});

// ========================================
// Stack 2: Backend (Lambda + API Gateway)
// ========================================

const backendStack = new BackendStack(app, `${config.appPrefix}-backend`, {
  config,
  env,
  description: 'IPC Cost Evaluator - FastAPI Lambda + API Gateway',
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
// ========================================

const frontendStack = new FrontendStack(app, `${config.appPrefix}-frontend`, {
  config,
  env,
  description: 'IPC Cost Evaluator - S3 Static Website + CloudFront',
  apiUrl: backendStack.api.apiUrl,
});

// Frontend 依赖 Backend
frontendStack.addDependency(backendStack);

// ========================================
// 应用级别标签
// ========================================

cdk.Tags.of(app).add('Application', 'ipc-case-cost-evaluator');
cdk.Tags.of(app).add('Environment', config.envName);
