/**
 * Backend Stack
 * 创建 Lambda 函数和 API Gateway
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { FastApiLambda } from '../constructs/fastapi-lambda';
import { EnvironmentConfig } from '../config/environments';

/**
 * Backend Stack 属性
 */
export interface BackendStackProps extends cdk.StackProps {
  /** 环境配置 */
  config: EnvironmentConfig;
  /** DynamoDB 表引用 */
  tables: {
    usersTable: dynamodb.ITable;
    evaluationsTable: dynamodb.ITable;
    sharesTable: dynamodb.ITable;
  };
}

/**
 * Backend Stack
 * 包含 Lambda 函数和 API Gateway HTTP API
 */
export class BackendStack extends cdk.Stack {
  /** FastAPI Lambda 构造 */
  public readonly api: FastApiLambda;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const { config, tables } = props;

    // ========================================
    // FastAPI Lambda + API Gateway
    // ========================================

    this.api = new FastApiLambda(this, 'Api', {
      config,
      tables,
    });

    // ========================================
    // Stack Outputs
    // ========================================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.apiUrl,
      description: 'API Gateway HTTP API URL',
      exportName: `${config.appPrefix}-api-url`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.api.function.functionName,
      description: 'Lambda Function Name',
      exportName: `${config.appPrefix}-lambda-name`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.api.function.functionArn,
      description: 'Lambda Function ARN',
      exportName: `${config.appPrefix}-lambda-arn`,
    });

    // ========================================
    // 标签
    // ========================================

    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}
