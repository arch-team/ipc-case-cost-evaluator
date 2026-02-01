/**
 * 关键指标摘要栏组件
 * 4 列网格布局，显示存储量、数据量、PUT、GET 四个核心指标
 */
import React from 'react';
import { Typography } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  HddOutlined,
} from '@ant-design/icons';
import type { UsageMetrics } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { formatLargeNumber } from '../../utils/calculationHelpers';

const { Text } = Typography;

interface MetricSummaryBarProps {
  metrics: UsageMetrics;
}

// 格式化存储量显示（自动选择 GB 或 TB）
const formatStorage = (gb: number): string => {
  if (gb >= 1000) {
    return `${formatNumber(gb / 1024, 2)} TB`;
  }
  return `${formatNumber(gb, 2)} GB`;
};

// 格式化数据量显示
const formatDataVolume = (gb: number): string => {
  return `${formatNumber(gb, 0)} GB`;
};

const MetricSummaryBar: React.FC<MetricSummaryBarProps> = ({ metrics }) => {
  const items = [
    {
      icon: <HddOutlined />,
      label: '平均存储量',
      value: formatStorage(metrics.avg_storage_gb),
      color: '#1890ff',
    },
    {
      icon: <DatabaseOutlined />,
      label: '月度数据量',
      value: formatDataVolume(metrics.daily_data_gb * 30),
      color: '#52c41a',
    },
    {
      icon: <CloudUploadOutlined />,
      label: '月度 PUT',
      value: formatLargeNumber(metrics.monthly_puts),
      color: '#722ed1',
    },
    {
      icon: <CloudDownloadOutlined />,
      label: '月度 GET',
      value: formatLargeNumber(metrics.monthly_gets),
      color: '#faad14',
    },
  ];

  return (
    <div className="metric-summary-bar">
      {items.map((item, index) => (
        <div key={index} className="metric-summary-item">
          <div className="metric-summary-icon" style={{ color: item.color }}>
            {item.icon}
          </div>
          <div className="metric-summary-content">
            <Text className="metric-summary-label">{item.label}</Text>
            <Text className="metric-summary-value">{item.value}</Text>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricSummaryBar;
