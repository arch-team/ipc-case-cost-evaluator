/**
 * Frontend Stack
 * 创建 S3 存储桶和 CloudFront 分发
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StaticWebsite } from '../constructs/static-website';
import { EnvironmentConfig } from '../config/environments';

/**
 * Frontend Stack 属性
 */
export interface FrontendStackProps extends cdk.StackProps {
  /** 环境配置 */
  config: EnvironmentConfig;
  /** API Gateway URL */
  apiUrl: string;
}

/**
 * Frontend Stack
 * 包含 S3 存储桶、CloudFront 分发
 */
export class FrontendStack extends cdk.Stack {
  /** 静态网站构造 */
  public readonly website: StaticWebsite;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { config, apiUrl } = props;

    // ========================================
    // 静态网站 (S3 + CloudFront)
    // ========================================

    this.website = new StaticWebsite(this, 'Website', {
      config,
      apiUrl,
    });

    // 部署前端构建产物
    // 注意: 需要在部署前先执行 `cd frontend && npm run build`
    // this.website.deployFrontend();

    // ========================================
    // Stack Outputs
    // ========================================

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: this.website.websiteUrl,
      description: 'Website CloudFront URL',
      exportName: `${config.appPrefix}-website-url`,
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.website.bucket.bucketName,
      description: 'S3 Bucket Name',
      exportName: `${config.appPrefix}-bucket-name`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.website.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${config.appPrefix}-distribution-id`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.website.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${config.appPrefix}-distribution-domain`,
    });

    // ========================================
    // 标签
    // ========================================

    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}
