/**
 * 结果展示组件
 * 优化版本：三层信息架构，Hero 区域突出单设备成本
 */
import React, { useState } from 'react';
import { Statistic, Button, Typography, Segmented, Collapse, Tag } from 'antd';
import {
  DownloadOutlined,
  DollarOutlined,
  PieChartOutlined,
  TableOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { CostSummary, TechnicalDimensions, StorageClass } from '../../types';
import { formatNumber } from '../../utils/formatters';
import CostPieChart from './CostPieChart';
import CostBreakdownTable from './CostBreakdownTable';

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
  region: string;  // AWS 区域（用于获取定价）
  // 功能参数（用于显示公式中的具体数值）
  retentionDays?: number;
  accessPattern?: number;
  onExport?: () => void;
}

type BreakdownViewType = 'chart' | 'table';

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, schemeInfo, region, retentionDays, accessPattern, onExport }) => {
  const [breakdownView, setBreakdownView] = useState<BreakdownViewType>('table');

  // 使用共用格式化函数 formatNumber
  // 从 ../../utils/formatters 导入

  // 获取存储类型的中文描述
  const getStorageClassLabel = (storageClass: string): string => {
    const labels: Record<string, string> = {
      'STANDARD': 'S3 Standard',
      'GLACIER_IR': 'S3 Glacier IR',
    };
    return labels[storageClass] || storageClass;
  };

  // 获取方案技术描述
  const getSchemeDescription = (): string => {
    if (!schemeInfo) return '';
    const { technical } = schemeInfo;
    if (technical.lifecycle_policy?.enabled) {
      const stages = technical.lifecycle_policy.stages || [];
      if (stages.length > 0) {
        return `生命周期策略 (${stages.length}阶段)`;
      }
      return '生命周期策略';
    }
    return getStorageClassLabel(technical.storage_class);
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
            <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>
              {getSchemeDescription()}
            </Text>
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

      {/* 费用明细区域 - Tab 切换 */}
      <div className="result-breakdown-section" data-testid="result-breakdown-section">
        <div className="result-breakdown-header">
          <span className="result-breakdown-title">费用构成</span>
          <Segmented
            value={breakdownView}
            onChange={(value) => setBreakdownView(value as BreakdownViewType)}
            options={[
              {
                label: (
                  <span>
                    <TableOutlined style={{ marginRight: 4 }} />
                    表格
                  </span>
                ),
                value: 'table',
              },
              {
                label: (
                  <span>
                    <PieChartOutlined style={{ marginRight: 4 }} />
                    图表
                  </span>
                ),
                value: 'chart',
              },
            ]}
          />
        </div>

        {/* 根据选择显示表格或图表 */}
        {breakdownView === 'table' ? (
          <CostBreakdownTable
            breakdown={result.breakdown}
            metrics={result.metrics}
            monthlyTotal={result.monthly_total}
            pricingMetadata={result.pricing_metadata}
            region={region}
            storageClass={(schemeInfo?.technical.storage_class || 'STANDARD') as StorageClass}
            deviceCount={result.device_count}
            retentionDays={retentionDays}
            accessPattern={accessPattern}
            detailedBreakdown={result.detailed_breakdown ? {
              storageCosts: result.detailed_breakdown.storage_costs?.map(c => ({
                name: c.name,
                unitPrice: c.unit_price,
                unitPriceUnit: c.unit_price_unit,
                quantity: c.quantity,
                quantityUnit: c.quantity_unit,
                amount: c.amount,
              })),
              dataTransferTiers: result.detailed_breakdown.data_transfer_tiers?.map(t => ({
                tierName: t.tier_name,
                rangeStartGb: t.range_start_gb,
                rangeEndGb: t.range_end_gb,
                unitPrice: t.unit_price,
                quantityGb: t.quantity_gb,
                amount: t.amount,
              })),
            } : undefined}
          />
        ) : (
          <div style={{ padding: '16px 0' }}>
            <CostPieChart breakdown={result.breakdown} />
          </div>
        )}
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
