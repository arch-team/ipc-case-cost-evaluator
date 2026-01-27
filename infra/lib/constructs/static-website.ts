/**
 * 静态网站构造
 * 创建 S3 存储桶、CloudFront 分发和 SPA 路由函数
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environments';

/**
 * 静态网站构造属性
 */
export interface StaticWebsiteProps {
  /** 环境配置 */
  config: EnvironmentConfig;
  /** API Gateway URL (用于配置 CloudFront 后端源站) */
  apiUrl: string;
}

/**
 * 静态网站构造
 * 包含 S3 存储桶、CloudFront 分发
 */
export class StaticWebsite extends Construct {
  /** S3 存储桶 */
  public readonly bucket: s3.Bucket;
  /** CloudFront 分发 */
  public readonly distribution: cloudfront.Distribution;
  /** 网站 URL */
  public readonly websiteUrl: string;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    const { config, apiUrl } = props;

    // ========================================
    // S3 存储桶 (私有访问)
    // ========================================

    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${config.appPrefix}-website-${cdk.Aws.ACCOUNT_ID}`,
      // 私有访问 - 只通过 CloudFront 访问
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // 删除策略
      removalPolicy: config.removalPolicy,
      autoDeleteObjects: config.removalPolicy === cdk.RemovalPolicy.DESTROY,
      // 加密
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ========================================
    // CloudFront Function - SPA 路由
    // ========================================

    // SPA 路由函数: 将所有非静态资源请求重写到 index.html
    const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
      functionName: `${config.appPrefix}-spa-routing`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 如果 URI 包含文件扩展名，则直接返回（静态资源）
  if (uri.includes('.')) {
    return request;
  }

  // 如果 URI 是 /api 开头，不处理（由 API 源站处理）
  if (uri.startsWith('/api')) {
    return request;
  }

  // 其他请求重写到 index.html（SPA 路由）
  request.uri = '/index.html';
  return request;
}
      `),
    });

    // ========================================
    // CloudFront 分发
    // ========================================

    // 解析 API URL 获取域名
    // apiUrl 格式: https://xxx.execute-api.region.amazonaws.com
    // 使用 CloudFormation 内置函数处理跨栈引用的 Token
    // Fn.split('/', apiUrl) => ['https:', '', 'xxx.execute-api.region.amazonaws.com']
    // Fn.select(2, ...) => 'xxx.execute-api.region.amazonaws.com'
    const apiDomain = cdk.Fn.select(2, cdk.Fn.split('/', apiUrl));

    // API 源站
    const apiOrigin = new cloudfrontOrigins.HttpOrigin(apiDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    // S3 源站 (使用 OAC)
    const s3Origin = cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(this.bucket);

    // CloudFront 价格等级映射
    const priceClassMap: Record<string, cloudfront.PriceClass> = {
      'PriceClass_100': cloudfront.PriceClass.PRICE_CLASS_100,
      'PriceClass_200': cloudfront.PriceClass.PRICE_CLASS_200,
      'PriceClass_All': cloudfront.PriceClass.PRICE_CLASS_ALL,
    };

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${config.appPrefix} - IPC Cost Evaluator`,
      defaultRootObject: 'index.html',
      // 价格等级
      priceClass: priceClassMap[config.cloudfront.priceClass] || cloudfront.PriceClass.PRICE_CLASS_100,
      // 默认行为 - S3 静态网站
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        // SPA 路由函数
        functionAssociations: [{
          function: spaRoutingFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      // 额外行为 - API 代理
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          // API 请求不缓存
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          // 允许所有 HTTP 方法
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          // 转发所有请求头和查询字符串
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      // 错误页面处理 (SPA 404 回退)
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // 网站 URL
    this.websiteUrl = `https://${this.distribution.distributionDomainName}`;

    // ========================================
    // 标签
    // ========================================
    cdk.Tags.of(this.bucket).add('Component', 'website');
    cdk.Tags.of(this.distribution).add('Component', 'cdn');
  }

  /**
   * 部署前端构建产物到 S3
   * 注意: 这需要在部署前先构建前端
   */
  public deployFrontend(): void {
    new s3Deployment.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        s3Deployment.Source.asset(path.join(__dirname, '../../../frontend/dist')),
      ],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
  }
}
