/**
 * FastAPI Lambda 构造
 * 创建 Lambda 函数和 API Gateway HTTP API
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

/**
 * FastAPI Lambda 构造属性
 */
export interface FastApiLambdaProps {
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
 * FastAPI Lambda 构造
 * 包含 Lambda 函数、API Gateway HTTP API
 */
export class FastApiLambda extends Construct {
  /** Lambda 函数 */
  public readonly function: lambda.Function;
  /** API Gateway HTTP API */
  public readonly httpApi: apigatewayv2.HttpApi;
  /** API Gateway URL */
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: FastApiLambdaProps) {
    super(scope, id);

    const { config, tables } = props;

    // ========================================
    // CloudWatch Log Group
    // ========================================

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${config.appPrefix}-api`,
      retention: config.envName === 'prod'
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: config.removalPolicy,
    });

    // ========================================
    // Lambda 函数
    // ========================================

    // 使用容器镜像
    this.function = new lambda.DockerImageFunction(this, 'FastApiFunction', {
      functionName: `${config.appPrefix}-api`,
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../../backend'),
        {
          file: 'Dockerfile.lambda',
          // 构建参数
          buildArgs: {},
          // 排除不需要的文件
          exclude: [
            '.venv',
            '__pycache__',
            '*.pyc',
            '.pytest_cache',
            'tests',
            '.git',
            '*.md',
          ],
        }
      ),
      memorySize: config.lambda.memorySize,
      timeout: cdk.Duration.seconds(config.lambda.timeout),
      environment: {
        ...config.lambda.environment,
        // DynamoDB 表名
        USERS_TABLE: tables.usersTable.tableName,
        EVALUATIONS_TABLE: tables.evaluationsTable.tableName,
        SHARES_TABLE: tables.sharesTable.tableName,
        // AWS 区域 (使用 APP_REGION，AWS_DEFAULT_REGION 是保留变量)
        APP_REGION: config.region,
      },
      reservedConcurrentExecutions: config.lambda.reservedConcurrency,
      // 日志配置 (使用预创建的 Log Group)
      logGroup: logGroup,
      // 架构
      architecture: lambda.Architecture.ARM_64, // Graviton2，更便宜
    });

    // ========================================
    // IAM 权限 - DynamoDB 访问
    // ========================================

    // 授予 Lambda 对 DynamoDB 表的读写权限
    tables.usersTable.grantReadWriteData(this.function);
    tables.evaluationsTable.grantReadWriteData(this.function);
    tables.sharesTable.grantReadWriteData(this.function);

    // ========================================
    // API Gateway HTTP API
    // ========================================

    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${config.appPrefix}-http-api`,
      description: 'IPC Case Cost Evaluator API',
      // CORS 配置
      corsPreflight: {
        allowOrigins: ['*'], // 生产环境应该限制域名
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
        ],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Lambda 集成
    const lambdaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      this.function
    );

    // 添加路由 - 代理所有请求到 Lambda
    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // 添加根路由
    this.httpApi.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // API URL
    this.apiUrl = this.httpApi.apiEndpoint;

    // ========================================
    // 标签
    // ========================================
    cdk.Tags.of(this.function).add('Component', 'api');
    cdk.Tags.of(this.httpApi).add('Component', 'api-gateway');
  }
}
