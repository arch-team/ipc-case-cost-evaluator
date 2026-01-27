/**
 * 环境配置接口和默认值
 * 支持 dev 和 prod 两种环境
 */

import * as cdk from 'aws-cdk-lib';

/**
 * 环境配置接口
 */
export interface EnvironmentConfig {
  /** 环境名称 */
  envName: string;
  /** AWS 区域 */
  region: string;
  /** 应用前缀 (用于资源命名) */
  appPrefix: string;
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
  /** 标签 */
  tags: Record<string, string>;
}

/**
 * 开发环境配置
 */
export const devConfig: EnvironmentConfig = {
  envName: 'dev',
  region: 'us-east-1',
  appPrefix: 'ipc-cost-dev',
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  dynamodb: {
    tablePrefix: 'ipc-cost-dev',
    pointInTimeRecovery: false,
  },
  lambda: {
    memorySize: 512,
    timeout: 30,
    reservedConcurrency: undefined, // 不限制
    environment: {
      ENVIRONMENT: 'dev',
      LOG_LEVEL: 'DEBUG',
      STORAGE_TYPE: 'dynamodb',
    },
  },
  cloudfront: {
    priceClass: 'PriceClass_100', // 最便宜，仅北美和欧洲
    enableLogging: false,
  },
  tags: {
    Environment: 'dev',
    Project: 'ipc-case-cost-evaluator',
    ManagedBy: 'cdk',
  },
};

/**
 * 生产环境配置
 */
export const prodConfig: EnvironmentConfig = {
  envName: 'prod',
  region: 'us-east-1',
  appPrefix: 'ipc-cost-prod',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  dynamodb: {
    tablePrefix: 'ipc-cost-prod',
    pointInTimeRecovery: true,
  },
  lambda: {
    memorySize: 1024,
    timeout: 30,
    reservedConcurrency: 100,
    environment: {
      ENVIRONMENT: 'prod',
      LOG_LEVEL: 'INFO',
      STORAGE_TYPE: 'dynamodb',
    },
  },
  cloudfront: {
    priceClass: 'PriceClass_200', // 北美、欧洲、亚洲
    enableLogging: true,
  },
  tags: {
    Environment: 'prod',
    Project: 'ipc-case-cost-evaluator',
    ManagedBy: 'cdk',
  },
};

/**
 * 根据环境名称获取配置
 */
export function getConfig(envName: string): EnvironmentConfig {
  switch (envName) {
    case 'prod':
      return prodConfig;
    case 'dev':
    default:
      return devConfig;
  }
}

/**
 * 从 CDK context 获取环境配置
 */
export function getConfigFromContext(app: cdk.App): EnvironmentConfig {
  const envName = app.node.tryGetContext('environment') || 'dev';
  return getConfig(envName);
}
