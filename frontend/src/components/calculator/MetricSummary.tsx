/**
 * 关键指标摘要组件
 *
 * 固定显示 4 个关键指标：
 * - 平均存储量
 * - 月度数据量
 * - 月度 PUT 请求
 * - 月度 GET 请求
 */
import React from 'react';
import { Row, Col, Typography } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  HddOutlined,
} from '@ant-design/icons';
import type { IntermediateMetricsDetail } from '../../types/calculationRecords';
import { formatNumber } from '../../utils/formatters';
import { formatLargeNumber } from '../../utils/calculationHelpers';

const { Text } = Typography;

interface MetricSummaryProps {
  metrics: IntermediateMetricsDetail;
}

interface SummaryMetric {
  key: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const MetricSummary: React.FC<MetricSummaryProps> = ({ metrics }) => {
  // 构建摘要指标数据
  const summaryMetrics: SummaryMetric[] = [
    {
      key: 'storage',
      label: '平均存储量',
      value: metrics.avg_storage_tb >= 1
        ? `${formatNumber(metrics.avg_storage_tb, 2)} TB`
        : `${formatNumber(metrics.avg_storage_gb, 2)} GB`,
      icon: <HddOutlined />,
      color: '#5470c6',
    },
    {
      key: 'data',
      label: '月度数据量',
      value: `${formatNumber(metrics.monthly_data_gb, 2)} GB`,
      icon: <DatabaseOutlined />,
      color: '#91cc75',
    },
    {
      key: 'puts',
      label: '月度 PUT',
      value: formatLargeNumber(metrics.monthly_puts),
      icon: <CloudUploadOutlined />,
      color: '#fac858',
    },
    {
      key: 'gets',
      label: '月度 GET',
      value: formatLargeNumber(metrics.monthly_gets),
      icon: <CloudDownloadOutlined />,
      color: '#ee6666',
    },
  ];

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)',
        borderRadius: 8,
        padding: '16px 20px',
      }}
    >
      <Row gutter={[16, 12]}>
        {summaryMetrics.map((metric) => (
          <Col key={metric.key} xs={12} sm={6}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${metric.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: metric.color,
                  fontSize: 16,
                }}
              >
                {metric.icon}
              </div>
              <div>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: 'block', lineHeight: 1.2 }}
                >
                  {metric.label}
                </Text>
                <Text
                  strong
                  style={{ fontSize: 16, color: '#262626', lineHeight: 1.3 }}
                >
                  {metric.value}
                </Text>
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MetricSummary;
