/**
 * DynamoDB 表构造
 * 创建应用所需的表: users, evaluations, shares, calculation_records
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
 * 创建 users, evaluations, shares, calculation_records 表
 */
export class DynamoDBTables extends Construct {
  /** 用户表 */
  public readonly usersTable: dynamodb.Table;
  /** 评估表 */
  public readonly evaluationsTable: dynamodb.Table;
  /** 分享表 */
  public readonly sharesTable: dynamodb.Table;
  /** 核算记录表 */
  public readonly calculationRecordsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBTablesProps) {
    super(scope, id);

    const { config } = props;
    const tablePrefix = config.dynamodb.tablePrefix;

    // 通用表配置
    const commonTableProps = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: config.removalPolicy,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: config.dynamodb.pointInTimeRecovery,
      },
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
    };

    // ========================================
    // Users 表
    // ========================================
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      ...commonTableProps,
      tableName: `${tablePrefix}-users`,
    });

    // ========================================
    // Evaluations 表
    // ========================================
    this.evaluationsTable = new dynamodb.Table(this, 'EvaluationsTable', {
      ...commonTableProps,
      tableName: `${tablePrefix}-evaluations`,
    });

    // ========================================
    // Shares 表
    // ========================================
    this.sharesTable = new dynamodb.Table(this, 'SharesTable', {
      ...commonTableProps,
      tableName: `${tablePrefix}-shares`,
      timeToLiveAttribute: 'expires_at',
    });

    // ========================================
    // Calculation Records 表 (核算记录)
    // ========================================
    this.calculationRecordsTable = new dynamodb.Table(this, 'CalculationRecordsTable', {
      ...commonTableProps,
      tableName: `${tablePrefix}-calculation-records`,
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
    });

    // 配置全局二级索引
    this.configureGlobalSecondaryIndexes();

    // 应用标签
    this.applyTags();
  }

  /**
   * 配置全局二级索引
   */
  private configureGlobalSecondaryIndexes(): void {
    // Users 表: email 索引 (用于邮箱登录)
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Evaluations 表: user_id 索引 (用于查询用户的评估列表)
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

    // Shares 表: evaluation_id 索引 (用于查询评估的分享列表)
    this.sharesTable.addGlobalSecondaryIndex({
      indexName: 'evaluation_id-index',
      partitionKey: {
        name: 'evaluation_id',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }

  /**
   * 应用标签
   */
  private applyTags(): void {
    cdk.Tags.of(this.usersTable).add('Table', 'users');
    cdk.Tags.of(this.evaluationsTable).add('Table', 'evaluations');
    cdk.Tags.of(this.sharesTable).add('Table', 'shares');
    cdk.Tags.of(this.calculationRecordsTable).add('Table', 'calculation-records');
  }
}
