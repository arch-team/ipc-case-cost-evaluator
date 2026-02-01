/**
 * 结果展示组件 - 决策摘要区域
 * 优化版本：Hero 区域 + 副指标栏 + 费用明细 + 使用量指标（可折叠）
 * 包含完整的推荐方案信息展示
 */
import React from 'react';
import { Statistic, Button, Typography, Collapse, Tag } from 'antd';
import {
  DownloadOutlined,
  DollarOutlined,
  DownOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { CostSummary, TechnicalDimensions, ComparisonItem } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { getTechDescription } from '../../constants/comparison';
import BreakdownContent from './BreakdownContent';

const { Title, Text } = Typography;

// 方案信息
interface SchemeInfo {
  id: string;
  name: string;
  technical: TechnicalDimensions;
}

interface ResultDisplayProps {
  result: CostSummary;
  schemeInfo?: SchemeInfo;  // 当前显示结果对应的方案信息
  isRecommended?: boolean;  // 当前方案是否为推荐方案
  region?: string;          // 区域（用于费用明细）
  retentionDays?: number;   // 保留天数（用于费用明细）
  accessPattern?: number;   // 访问模式（用于费用明细）
  onExport?: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  schemeInfo,
  isRecommended = false,
  region = 'us-east-1',
  retentionDays,
  accessPattern,
  onExport,
}) => {
  // 获取方案技术描述（使用统一的 getTechDescription 函数）
  const getSchemeDescriptionLines = (): string[] => {
    if (!schemeInfo) return [];
    // 构造一个临时的 ComparisonItem 对象以复用 getTechDescription
    const tempItem: ComparisonItem = {
      name: schemeInfo.name,
      storage_class: schemeInfo.technical.storage_class,
      monthly_cost: 0,
      yearly_cost: 0,
      vs_baseline: 0,
      is_recommended: false,
      technical: schemeInfo.technical,
    };
    return getTechDescription(tempItem);
  };

  return (
    <div>
      {/* 页面标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <DollarOutlined style={{ marginRight: 8 }} />
          成本计算结果
        </Title>
        {onExport && (
          <Button type="primary" icon={<DownloadOutlined />} onClick={onExport}>
            导出 Excel
          </Button>
        )}
      </div>

      {/* Hero 区域 - 单设备月均费用 */}
      <div className="result-hero" data-testid="result-hero">
        {/* 方案标识 */}
        {schemeInfo && (
          <div className="result-hero-scheme" data-testid="result-scheme-badge">
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              {schemeInfo.name}
            </Tag>
            {isRecommended && (
              <Tag
                color="green"
                icon={<CheckCircleOutlined />}
                className="result-recommended-badge"
              >
                推荐方案
              </Tag>
            )}
            <div style={{ marginLeft: 8, display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {getSchemeDescriptionLines().map((line, idx) => (
                <Text key={idx} type="secondary" style={{ fontSize: idx === 0 ? 13 : 12, lineHeight: 1.4 }}>
                  {line}
                </Text>
              ))}
            </div>
          </div>
        )}
        <div className="result-hero-label">单设备月均费用</div>
        <div className="result-hero-value">
          <span>$</span>
          {formatNumber(result.per_device_monthly, 4)}
        </div>
      </div>

      {/* 副指标栏 - 月度/年度/设备数 */}
      <div className="result-secondary-stats" data-testid="result-secondary-stats">
        <div className="result-secondary-card">
          <Statistic
            title="月度总费用"
            value={result.monthly_total}
            precision={2}
            prefix="$"
            valueStyle={{ color: '#2563eb' }}
          />
        </div>
        <div className="result-secondary-card">
          <Statistic
            title="年度总费用"
            value={result.yearly_total}
            precision={2}
            prefix="$"
            valueStyle={{ color: '#16a34a' }}
          />
        </div>
        <div className="result-secondary-card">
          <Statistic
            title="设备数量"
            value={result.device_count}
            suffix="台"
          />
        </div>
      </div>

      {/* 费用明细区域 */}
      <div className="result-breakdown-section" style={{ marginTop: 24 }}>
        <BreakdownContent
          result={result}
          schemeInfo={schemeInfo}
          region={region}
          retentionDays={retentionDays}
          accessPattern={accessPattern}
        />
      </div>

      {/* 使用量指标 - 可折叠面板 */}
      {result.metrics && (
        <Collapse
          className="result-metrics-collapse"
          expandIcon={({ isActive }) => (
            <DownOutlined rotate={isActive ? 180 : 0} style={{ fontSize: 12 }} />
          )}
          items={[
            {
              key: 'metrics',
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Text strong>使用量指标</Text>
                  <span className="result-metrics-summary">
                    <span className="result-metrics-summary-item">
                      存储 {formatNumber(result.metrics.avg_storage_gb)} GB
                    </span>
                    <span className="result-metrics-summary-item">
                      PUT 请求 {result.metrics.monthly_puts.toLocaleString()} 次
                    </span>
                    <span className="result-metrics-summary-item">
                      传输 {formatNumber(result.metrics.monthly_transfer_gb)} GB
                    </span>
                  </span>
                </div>
              ),
              children: (
                <div className="result-secondary-stats" style={{ marginBottom: 0 }}>
                  <div className="result-secondary-card">
                    <Statistic
                      title="月度存储量"
                      value={result.metrics.avg_storage_gb}
                      precision={2}
                      suffix="GB"
                    />
                  </div>
                  <div className="result-secondary-card">
                    <Statistic
                      title="月度 PUT 请求"
                      value={result.metrics.monthly_puts}
                      precision={0}
                      suffix="次"
                    />
                  </div>
                  <div className="result-secondary-card">
                    <Statistic
                      title="月度数据传输"
                      value={result.metrics.monthly_transfer_gb}
                      precision={2}
                      suffix="GB"
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default ResultDisplay;
