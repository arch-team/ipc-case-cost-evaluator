/**
 * DynamoDB 表构造
 * 创建应用所需的三个表: users, evaluations, shares
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

/**
 * DynamoDB 表构造属性
 */
export interface DynamoDBTablesProps {
  /** 环境配置 */
  config: EnvironmentConfig;
}

/**
 * DynamoDB 表构造
 * 创建 users, evaluations, shares 三个表
 */
export class DynamoDBTables extends Construct {
  /** 用户表 */
  public readonly usersTable: dynamodb.Table;
  /** 评估表 */
  public readonly evaluationsTable: dynamodb.Table;
  /** 分享表 */
  public readonly sharesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBTablesProps) {
    super(scope, id);

    const { config } = props;
    const tablePrefix = config.dynamodb.tablePrefix;

    // ========================================
    // Users 表
    // ========================================
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `${tablePrefix}-users`,
      partitionKey: {
        name: 'username',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // 按需计费
      removalPolicy: config.removalPolicy,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: config.dynamodb.pointInTimeRecovery,
      },
    });

    // 添加 email GSI (用于邮箱登录)
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // Evaluations 表
    // ========================================
    this.evaluationsTable = new dynamodb.Table(this, 'EvaluationsTable', {
      tableName: `${tablePrefix}-evaluations`,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: config.removalPolicy,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: config.dynamodb.pointInTimeRecovery,
      },
    });

    // 添加 user_id GSI (用于查询用户的评估列表)
    this.evaluationsTable.addGlobalSecondaryIndex({
      indexName: 'user_id-index',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'created_at',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // Shares 表
    // ========================================
    this.sharesTable = new dynamodb.Table(this, 'SharesTable', {
      tableName: `${tablePrefix}-shares`,
      partitionKey: {
        name: 'share_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: config.removalPolicy,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: config.dynamodb.pointInTimeRecovery,
      },
      // 启用 TTL (用于分享链接过期)
      timeToLiveAttribute: 'expires_at',
    });

    // 添加 evaluation_id GSI (用于查询评估的分享列表)
    this.sharesTable.addGlobalSecondaryIndex({
      indexName: 'evaluation_id-index',
      partitionKey: {
        name: 'evaluation_id',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ========================================
    // 标签
    // ========================================
    cdk.Tags.of(this.usersTable).add('Table', 'users');
    cdk.Tags.of(this.evaluationsTable).add('Table', 'evaluations');
    cdk.Tags.of(this.sharesTable).add('Table', 'shares');
  }
}
