/**
 * 环境配置接口和默认值
 * 支持 dev、staging、prod 三种环境
 */

import * as cdk from 'aws-cdk-lib';

/**
 * 支持的环境类型
 */
export type EnvironmentType = 'dev' | 'staging' | 'prod';

/**
 * 环境配置接口
 */
export interface EnvironmentConfig {
  /** 环境名称 */
  envName: EnvironmentType;
  /** AWS 区域 */
  region: string;
  /** 应用前缀 (用于资源命名) */
  appPrefix: string;
  /** 栈名称前缀 (用于 CloudFormation 栈命名) */
  stackPrefix: string;
  /** 是否启用删除保护 */
  removalPolicy: cdk.RemovalPolicy;
  /** DynamoDB 配置 */
  dynamodb: {
    /** 表名前缀 */
    tablePrefix: string;
    /** 是否启用时间点恢复 */
    pointInTimeRecovery: boolean;
  };
  /** Lambda 配置 */
  lambda: {
    /** 内存大小 (MB) */
    memorySize: number;
    /** 超时时间 (秒) */
    timeout: number;
    /** 预留并发数 (0 表示不预留) */
    reservedConcurrency?: number;
    /** 环境变量 */
    environment: Record<string, string>;
  };
  /** CloudFront 配置 */
  cloudfront: {
    /** 价格等级 */
    priceClass: string;
    /** 是否启用日志 */
    enableLogging: boolean;
  };
  /** API Gateway 配置 */
  apiGateway: {
    /** CORS 允许的源站列表 */
    corsAllowOrigins: string[];
  };
  /** 标签 */
  tags: Record<string, string>;
}

/**
 * 基础配置模板
 */
const baseConfig = {
  region: 'us-east-1',
  dynamodb: {
    pointInTimeRecovery: false,
  },
  lambda: {
    timeout: 30,
    environment: {
      STORAGE_TYPE: 'dynamodb',
    },
  },
  apiGateway: {
    corsAllowOrigins: ['*'],
  },
  tags: {
    Project: 'ipc-case-cost-evaluator',
    ManagedBy: 'cdk',
  },
};

/**
 * 开发环境配置
 * 用于本地开发和功能测试
 */
export const devConfig: EnvironmentConfig = {
  envName: 'dev',
  region: baseConfig.region,
  appPrefix: 'ipc-cost-dev',
  stackPrefix: 'IPCCostEvaluator-Dev',
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  dynamodb: {
    tablePrefix: 'ipc-cost-dev',
    pointInTimeRecovery: baseConfig.dynamodb.pointInTimeRecovery,
  },
  lambda: {
    memorySize: 512,
    timeout: baseConfig.lambda.timeout,
    reservedConcurrency: undefined,
    environment: {
      ...baseConfig.lambda.environment,
      ENVIRONMENT: 'dev',
      LOG_LEVEL: 'DEBUG',
      SECRET_KEY: 'dev-secret-key-for-development-only-do-not-use-in-production',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'Admin123456',
    },
  },
  cloudfront: {
    priceClass: 'PriceClass_100',
    enableLogging: false,
  },
  apiGateway: baseConfig.apiGateway,
  tags: {
    ...baseConfig.tags,
    Environment: 'dev',
  },
};

/**
 * 预发布环境配置
 * 用于集成测试和验收测试
 */
export const stagingConfig: EnvironmentConfig = {
  envName: 'staging',
  region: baseConfig.region,
  appPrefix: 'ipc-cost-staging',
  stackPrefix: 'IPCCostEvaluator-Staging',
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  dynamodb: {
    tablePrefix: 'ipc-cost-staging',
    pointInTimeRecovery: baseConfig.dynamodb.pointInTimeRecovery,
  },
  lambda: {
    memorySize: 1024,
    timeout: baseConfig.lambda.timeout,
    reservedConcurrency: 50,
    environment: {
      ...baseConfig.lambda.environment,
      ENVIRONMENT: 'staging',
      LOG_LEVEL: 'INFO',
      SECRET_KEY: process.env.STAGING_SECRET_KEY || 'staging-temp-key-change-in-production',
    },
  },
  cloudfront: {
    priceClass: 'PriceClass_100',
    enableLogging: true,
  },
  apiGateway: baseConfig.apiGateway,
  tags: {
    ...baseConfig.tags,
    Environment: 'staging',
  },
};

/**
 * 生产环境配置
 * 用于正式线上服务
 */
export const prodConfig: EnvironmentConfig = {
  envName: 'prod',
  region: baseConfig.region,
  appPrefix: 'ipc-cost-prod',
  stackPrefix: 'IPCCostEvaluator-Prod',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  dynamodb: {
    tablePrefix: 'ipc-cost-prod',
    pointInTimeRecovery: true,
  },
  lambda: {
    memorySize: 1024,
    timeout: baseConfig.lambda.timeout,
    reservedConcurrency: 100,
    environment: {
      ...baseConfig.lambda.environment,
      ENVIRONMENT: 'prod',
      LOG_LEVEL: 'INFO',
      SECRET_KEY: process.env.PROD_SECRET_KEY || '',
    },
  },
  cloudfront: {
    priceClass: 'PriceClass_200',
    enableLogging: true,
  },
  apiGateway: baseConfig.apiGateway,
  tags: {
    ...baseConfig.tags,
    Environment: 'prod',
  },
};

/**
 * 所有环境配置映射
 */
export const environments: Record<EnvironmentType, EnvironmentConfig> = {
  dev: devConfig,
  staging: stagingConfig,
  prod: prodConfig,
};

/**
 * 根据环境名称获取配置
 * @param envName 环境名称 (dev/staging/prod)
 * @returns 环境配置，未知环境默认返回 dev 配置
 */
export function getConfig(envName: string): EnvironmentConfig {
  const config = environments[envName as EnvironmentType];
  if (config) return config;

  console.warn(`[CDK] 未知环境 "${envName}"，使用默认环境 "dev"`);
  return devConfig;
}

/**
 * 从 CDK context 获取环境配置
 * 通过 -c environment=xxx 参数指定环境
 * @param app CDK 应用实例
 * @returns 环境配置
 */
export function getConfigFromContext(app: cdk.App): EnvironmentConfig {
  const envName = app.node.tryGetContext('environment') || 'dev';
  return getConfig(envName);
}

/**
 * 获取所有可用环境名称
 * @returns 环境名称数组
 */
export function getAvailableEnvironments(): EnvironmentType[] {
  return Object.keys(environments) as EnvironmentType[];
}
