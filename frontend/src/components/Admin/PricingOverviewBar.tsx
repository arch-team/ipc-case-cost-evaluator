/**
 * 定价快速概览条组件
 *
 * 在定价管理页面顶部显示 4 个关键指标：
 * - 当前区域
 * - Standard 存储价格
 * - 缓存状态
 * - API 状态
 */
import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
  GlobalOutlined,
  DollarOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { RegionInfo, PricingDetailResponse, PricingServiceStatus } from '../../types';

interface PricingOverviewBarProps {
  /** 当前选中的区域 ID */
  selectedRegion: string;
  /** 区域列表 */
  regions: RegionInfo[];
  /** 当前区域的定价数据 */
  pricing: PricingDetailResponse | null;
  /** 服务状态信息 */
  serviceStatus: PricingServiceStatus | null;
  /** 是否正在加载 */
  loading?: boolean;
}

const PricingOverviewBar: React.FC<PricingOverviewBarProps> = ({
  selectedRegion,
  regions,
  pricing,
  serviceStatus,
  loading = false,
}) => {
  // 获取当前区域名称
  const currentRegion = regions.find((r) => r.region === selectedRegion);
  const regionName = currentRegion?.name || selectedRegion;

  // 获取 Standard 存储价格
  const standardPricing = pricing?.storage_classes?.['STANDARD'];
  const standardPrice = standardPricing?.storage_per_gb_month;

  // 获取缓存状态
  const cacheInfo = serviceStatus?.cache?.[selectedRegion];
  const isFallback = cacheInfo?.is_fallback;
  const cacheStatus = cacheInfo?.cached
    ? isFallback
      ? '本地数据'
      : '实时缓存'
    : '未缓存';

  // 获取 API 状态
  const apiStatus = serviceStatus?.api_available;

  return (
    <div className="pricing-overview-bar">
      {/* 当前区域 */}
      <div className="pricing-overview-item">
        <GlobalOutlined className="pricing-overview-icon" style={{ color: '#1890ff' }} />
        <div className="pricing-overview-content">
          <span className="pricing-overview-label">当前区域</span>
          <div className="pricing-overview-value">
            <span>{regionName}</span>
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>
              {selectedRegion}
            </Tag>
          </div>
        </div>
      </div>

      {/* Standard 存储价格 */}
      <div className="pricing-overview-item">
        <DollarOutlined className="pricing-overview-icon" style={{ color: '#52c41a' }} />
        <div className="pricing-overview-content">
          <span className="pricing-overview-label">Standard 存储</span>
          <span className="pricing-overview-value pricing-overview-value-highlight">
            {loading ? (
              <SyncOutlined spin style={{ color: '#1890ff' }} />
            ) : standardPrice !== undefined ? (
              `$${standardPrice.toFixed(4)}/GB`
            ) : (
              '-'
            )}
          </span>
        </div>
      </div>

      {/* 缓存状态 */}
      <div className="pricing-overview-item">
        <DatabaseOutlined className="pricing-overview-icon" style={{ color: '#722ed1' }} />
        <div className="pricing-overview-content">
          <span className="pricing-overview-label">缓存状态</span>
          <div className="pricing-overview-value">
            {loading ? (
              <SyncOutlined spin style={{ color: '#1890ff' }} />
            ) : (
              <Tooltip
                title={
                  isFallback
                    ? 'API 不可用，使用本地预置数据'
                    : '数据来自 AWS Pricing API'
                }
              >
                <Tag color={isFallback ? 'orange' : 'green'}>{cacheStatus}</Tag>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* API 状态 */}
      <div className="pricing-overview-item">
        <CloudServerOutlined className="pricing-overview-icon" style={{ color: '#fa8c16' }} />
        <div className="pricing-overview-content">
          <span className="pricing-overview-label">API 状态</span>
          <div className="pricing-overview-value">
            {loading ? (
              <SyncOutlined spin style={{ color: '#1890ff' }} />
            ) : apiStatus === null ? (
              <Tag>未检测</Tag>
            ) : apiStatus ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                正常
              </Tag>
            ) : (
              <Tag icon={<ExclamationCircleOutlined />} color="error">
                异常
              </Tag>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingOverviewBar;
