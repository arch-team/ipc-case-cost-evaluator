/**
 * 中间指标对比组件
 */
import React from 'react';
import { Row, Col, Table, Typography } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Title, Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

interface MetricRow {
  key: string;
  label: string;
  unit: string;
  getValue: (r: CalculationRecord) => number;
  decimals?: number;
}

const MetricsComparison: React.FC<Props> = ({ records }) => {
  // 数据量指标
  const dataMetrics: MetricRow[] = [
    {
      key: 'daily_recording',
      label: '每日录像时长',
      unit: '小时',
      getValue: (r) => r.intermediate_metrics.daily_recording_seconds / 3600,
      decimals: 2,
    },
    {
      key: 'daily_data_gb',
      label: '每日数据量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.daily_data_gb,
      decimals: 4,
    },
    {
      key: 'monthly_data_gb',
      label: '月度数据量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.monthly_data_gb,
      decimals: 2,
    },
    {
      key: 'avg_storage_gb',
      label: '平均存储量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.avg_storage_gb,
      decimals: 2,
    },
  ];

  // 请求数指标
  const requestMetrics: MetricRow[] = [
    {
      key: 'segments_per_day',
      label: '每日分片数',
      unit: '个',
      getValue: (r) => r.intermediate_metrics.segments_per_day,
      decimals: 0,
    },
    {
      key: 'monthly_puts',
      label: '月度 PUT 请求',
      unit: 'K',
      getValue: (r) => r.intermediate_metrics.monthly_puts / 1000,
      decimals: 2,
    },
    {
      key: 'monthly_gets',
      label: '月度 GET 请求',
      unit: 'K',
      getValue: (r) => r.intermediate_metrics.monthly_gets / 1000,
      decimals: 2,
    },
    {
      key: 'monthly_retrieval',
      label: '月度检索量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.monthly_retrieval_gb,
      decimals: 2,
    },
    {
      key: 'monthly_transfer',
      label: '月度传输量',
      unit: 'GB',
      getValue: (r) => r.intermediate_metrics.monthly_transfer_gb,
      decimals: 2,
    },
  ];

  // 构建表格列
  const buildColumns = () => [
    {
      title: '指标',
      dataIndex: 'label',
      key: 'label',
      width: 140,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: RECORD_COLORS[idx],
              marginRight: 8,
            }}
          />
          {record.name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'right' as const,
    })),
  ];

  // 构建表格数据
  const buildDataSource = (metrics: MetricRow[]) =>
    metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      ...records.reduce(
        (acc, record, idx) => ({
          ...acc,
          [`value_${idx}`]: `${formatNumber(metric.getValue(record), metric.decimals ?? 2)} ${metric.unit}`,
        }),
        {}
      ),
    }));

  return (
    <Row gutter={24}>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>数据量指标</Title>
        <Table
          dataSource={buildDataSource(dataMetrics)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>请求数指标</Title>
        <Table
          dataSource={buildDataSource(requestMetrics)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
    </Row>
  );
};

export default MetricsComparison;
