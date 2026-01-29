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
 * 开发环境配置
 * 用于本地开发和功能测试
 */
export const devConfig: EnvironmentConfig = {
  envName: 'dev',
  region: 'us-east-1',
  appPrefix: 'ipc-cost-dev',
  stackPrefix: 'IPCCostEvaluator-Dev',
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
      // 初始管理员账号（首次启动时自动创建）
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'Admin123456',
    },
  },
  cloudfront: {
    priceClass: 'PriceClass_100', // 最便宜，仅北美和欧洲
    enableLogging: false,
  },
  apiGateway: {
    corsAllowOrigins: ['*'], // 开发环境允许所有源
  },
  tags: {
    Environment: 'dev',
    Project: 'ipc-case-cost-evaluator',
    ManagedBy: 'cdk',
  },
};

/**
 * 预发布环境配置
 * 用于集成测试和验收测试
 */
export const stagingConfig: EnvironmentConfig = {
  envName: 'staging',
  region: 'us-east-1',
  appPrefix: 'ipc-cost-staging',
  stackPrefix: 'IPCCostEvaluator-Staging',
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  dynamodb: {
    tablePrefix: 'ipc-cost-staging',
    pointInTimeRecovery: false,
  },
  lambda: {
    memorySize: 1024,
    timeout: 30,
    reservedConcurrency: 50, // 适中的并发限制
    environment: {
      ENVIRONMENT: 'staging',
      LOG_LEVEL: 'INFO',
      STORAGE_TYPE: 'dynamodb',
    },
  },
  cloudfront: {
    priceClass: 'PriceClass_100', // 控制成本
    enableLogging: true,
  },
  apiGateway: {
    // Staging 环境限制为 CloudFront 域名（部署后需更新为实际域名）
    corsAllowOrigins: ['https://*.cloudfront.net'],
  },
  tags: {
    Environment: 'staging',
    Project: 'ipc-case-cost-evaluator',
    ManagedBy: 'cdk',
  },
};

/**
 * 生产环境配置
 * 用于正式线上服务
 */
export const prodConfig: EnvironmentConfig = {
  envName: 'prod',
  region: 'us-east-1',
  appPrefix: 'ipc-cost-prod',
  stackPrefix: 'IPCCostEvaluator-Prod',
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
  apiGateway: {
    // 生产环境限制为 CloudFront 域名（部署后需更新为实际域名）
    corsAllowOrigins: ['https://*.cloudfront.net'],
  },
  tags: {
    Environment: 'prod',
    Project: 'ipc-case-cost-evaluator',
    ManagedBy: 'cdk',
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
  if (envName in environments) {
    return environments[envName as EnvironmentType];
  }
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
