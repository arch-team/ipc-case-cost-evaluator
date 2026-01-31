/**
 * 中间计算指标展示组件
 *
 * 展示详细的中间计算过程数据，分为两组：
 * 1. 数据量指标：录像秒数、数据量(KB/GB/TB)、存储量
 * 2. 请求数指标：分片数、PUT/GET请求数、检索量、传输量
 */
import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { IntermediateMetricsDetail } from '../../types/calculationRecords';
import { formatNumber } from '../../utils/formatters';

const { Text } = Typography;

interface IntermediateMetricsProps {
  metrics: IntermediateMetricsDetail;
  compact?: boolean; // 紧凑模式
}

const IntermediateMetrics: React.FC<IntermediateMetricsProps> = ({
  metrics,
  compact = false,
}) => {
  // 格式化大数字
  const formatLargeNumber = (value: number): string => {
    if (value >= 1_000_000) {
      return `${formatNumber(value / 1_000_000, 2)}M`;
    }
    if (value >= 1_000) {
      return `${formatNumber(value / 1_000, 2)}K`;
    }
    return formatNumber(value, 2);
  };

  // 数据量指标
  const dataMetrics = [
    {
      label: '每日录像时长',
      value: `${formatNumber(metrics.daily_recording_seconds / 3600, 2)} 小时`,
      icon: <ClockCircleOutlined />,
    },
    {
      label: '每日数据量',
      value: `${formatNumber(metrics.daily_data_gb, 4)} GB`,
      subValue: `${formatNumber(metrics.daily_data_kb / 1024, 2)} MB`,
      icon: <DatabaseOutlined />,
    },
    {
      label: '月度数据量',
      value: `${formatNumber(metrics.monthly_data_gb, 2)} GB`,
      icon: <DatabaseOutlined />,
    },
    {
      label: '平均存储量',
      value: metrics.avg_storage_tb >= 1
        ? `${formatNumber(metrics.avg_storage_tb, 2)} TB`
        : `${formatNumber(metrics.avg_storage_gb, 2)} GB`,
      icon: <DatabaseOutlined />,
    },
  ];

  // 请求数指标
  const requestMetrics = [
    {
      label: '每日分片数',
      value: formatLargeNumber(metrics.segments_per_day),
      icon: <CloudUploadOutlined />,
    },
    {
      label: '月度 PUT 请求',
      value: formatLargeNumber(metrics.monthly_puts),
      icon: <CloudUploadOutlined />,
    },
    {
      label: '月度 GET 请求',
      value: formatLargeNumber(metrics.monthly_gets),
      icon: <DownloadOutlined />,
    },
    {
      label: '月度检索量',
      value: `${formatNumber(metrics.monthly_retrieval_gb, 2)} GB`,
      icon: <DownloadOutlined />,
    },
    {
      label: '月度传输量',
      value: `${formatNumber(metrics.monthly_transfer_gb, 2)} GB`,
      icon: <DownloadOutlined />,
    },
  ];

  if (compact) {
    return (
      <div className="intermediate-metrics-compact">
        <Row gutter={[16, 8]}>
          {[...dataMetrics, ...requestMetrics].map((metric, index) => (
            <Col key={index} xs={12} sm={8} md={6} lg={4}>
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {metric.label}
                </Text>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {metric.value}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div className="intermediate-metrics">
      {/* 数据量指标 */}
      <Card
        size="small"
        title={
          <span>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            数据量指标
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[24, 16]}>
          {dataMetrics.map((metric, index) => (
            <Col key={index} xs={12} sm={12} md={6}>
              <Statistic
                title={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {metric.label}
                  </Text>
                }
                value={metric.value}
                valueStyle={{ fontSize: 16 }}
              />
              {metric.subValue && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  ({metric.subValue})
                </Text>
              )}
            </Col>
          ))}
        </Row>
      </Card>

      {/* 请求数指标 */}
      <Card
        size="small"
        title={
          <span>
            <CloudUploadOutlined style={{ marginRight: 8 }} />
            请求数指标
          </span>
        }
      >
        <Row gutter={[24, 16]}>
          {requestMetrics.map((metric, index) => (
            <Col key={index} xs={12} sm={8} md={index < 3 ? 8 : 6}>
              <Statistic
                title={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {metric.label}
                  </Text>
                }
                value={metric.value}
                valueStyle={{ fontSize: 16 }}
              />
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default IntermediateMetrics;
