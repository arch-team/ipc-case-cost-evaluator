/**
 * Database Stack
 * 创建 DynamoDB 表
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDBTables } from '../constructs/dynamodb-tables';
import { EnvironmentConfig } from '../config/environments';

/**
 * Database Stack 属性
 */
export interface DatabaseStackProps extends cdk.StackProps {
  /** 环境配置 */
  config: EnvironmentConfig;
}

/**
 * Database Stack
 * 包含所有 DynamoDB 表
 */
export class DatabaseStack extends cdk.Stack {
  /** DynamoDB 表构造 */
  public readonly tables: DynamoDBTables;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ========================================
    // DynamoDB 表
    // ========================================

    this.tables = new DynamoDBTables(this, 'Tables', {
      config,
    });

    // ========================================
    // Stack Outputs
    // ========================================

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.tables.usersTable.tableName,
      description: 'Users DynamoDB Table Name',
      exportName: `${config.appPrefix}-users-table`,
    });

    new cdk.CfnOutput(this, 'EvaluationsTableName', {
      value: this.tables.evaluationsTable.tableName,
      description: 'Evaluations DynamoDB Table Name',
      exportName: `${config.appPrefix}-evaluations-table`,
    });

    new cdk.CfnOutput(this, 'SharesTableName', {
      value: this.tables.sharesTable.tableName,
      description: 'Shares DynamoDB Table Name',
      exportName: `${config.appPrefix}-shares-table`,
    });

    // ========================================
    // 标签
    // ========================================

    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}
