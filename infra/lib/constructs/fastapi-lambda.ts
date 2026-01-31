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

    // 创建 CloudWatch Log Group
    const logGroup = this.createLogGroup(config);

    // 创建 Lambda 函数
    this.function = this.createLambdaFunction(config, tables, logGroup);

    // 授予 DynamoDB 权限
    this.grantDynamoDBPermissions(tables);

    // 创建 API Gateway
    this.httpApi = this.createApiGateway(config);
    this.apiUrl = this.httpApi.apiEndpoint;

    // 应用标签
    this.applyTags();
  }

  /**
   * 创建 CloudWatch Log Group
   */
  private createLogGroup(config: EnvironmentConfig): logs.LogGroup {
    const logRetention = config.envName === 'prod'
      ? logs.RetentionDays.ONE_MONTH
      : logs.RetentionDays.ONE_WEEK;

    return new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${config.appPrefix}-api`,
      retention: logRetention,
      removalPolicy: config.removalPolicy,
    });
  }

  /**
   * 创建 Lambda 函数
   */
  private createLambdaFunction(
    config: EnvironmentConfig,
    tables: FastApiLambdaProps['tables'],
    logGroup: logs.LogGroup
  ): lambda.DockerImageFunction {
    // Docker 镜像排除列表
    const dockerExcludes = [
      '.venv',
      '__pycache__',
      '*.pyc',
      '.pytest_cache',
      'tests',
      '.git',
      '*.md',
    ];

    return new lambda.DockerImageFunction(this, 'FastApiFunction', {
      functionName: `${config.appPrefix}-api`,
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../../backend'),
        {
          file: 'Dockerfile.lambda',
          buildArgs: {},
          exclude: dockerExcludes,
        }
      ),
      memorySize: config.lambda.memorySize,
      timeout: cdk.Duration.seconds(config.lambda.timeout),
      environment: this.buildLambdaEnvironment(config, tables),
      reservedConcurrentExecutions: config.lambda.reservedConcurrency,
      logGroup,
      architecture: lambda.Architecture.ARM_64,
    });
  }

  /**
   * 构建 Lambda 环境变量
   */
  private buildLambdaEnvironment(
    config: EnvironmentConfig,
    tables: FastApiLambdaProps['tables']
  ): Record<string, string> {
    return {
      ...config.lambda.environment,
      DYNAMODB_USERS_TABLE: tables.usersTable.tableName,
      DYNAMODB_EVALUATIONS_TABLE: tables.evaluationsTable.tableName,
      DYNAMODB_SHARES_TABLE: tables.sharesTable.tableName,
      APP_REGION: config.region,
      CORS_ALLOW_ORIGINS: config.apiGateway.corsAllowOrigins.join(','),
    };
  }

  /**
   * 授予 DynamoDB 权限
   */
  private grantDynamoDBPermissions(tables: FastApiLambdaProps['tables']): void {
    tables.usersTable.grantReadWriteData(this.function);
    tables.evaluationsTable.grantReadWriteData(this.function);
    tables.sharesTable.grantReadWriteData(this.function);
  }

  /**
   * 创建 API Gateway
   */
  private createApiGateway(config: EnvironmentConfig): apigatewayv2.HttpApi {
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${config.appPrefix}-http-api`,
      description: `IPC Case Cost Evaluator API (${config.envName})`,
      corsPreflight: this.buildCorsConfig(config),
    });

    // 配置路由
    this.configureRoutes(httpApi);

    return httpApi;
  }

  /**
   * 构建 CORS 配置
   */
  private buildCorsConfig(config: EnvironmentConfig): apigatewayv2.CorsPreflightOptions {
    return {
      allowOrigins: config.apiGateway.corsAllowOrigins,
      allowMethods: [
        apigatewayv2.CorsHttpMethod.GET,
        apigatewayv2.CorsHttpMethod.POST,
        apigatewayv2.CorsHttpMethod.PUT,
        apigatewayv2.CorsHttpMethod.DELETE,
        apigatewayv2.CorsHttpMethod.OPTIONS,
      ],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: cdk.Duration.hours(1),
    };
  }

  /**
   * 配置 API 路由
   */
  private configureRoutes(httpApi: apigatewayv2.HttpApi): void {
    const lambdaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      this.function
    );

    // 代理所有请求到 Lambda
    const routes = [
      { path: '/{proxy+}' },
      { path: '/' },
    ];

    routes.forEach(route => {
      httpApi.addRoutes({
        path: route.path,
        methods: [apigatewayv2.HttpMethod.ANY],
        integration: lambdaIntegration,
      });
    });
  }

  /**
   * 应用标签
   */
  private applyTags(): void {
    cdk.Tags.of(this.function).add('Component', 'api');
    cdk.Tags.of(this.httpApi).add('Component', 'api-gateway');
  }
}
