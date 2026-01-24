/**
 * 结果展示组件
 */
import React from 'react';
import { Card, Row, Col, Statistic, Table, Button, Typography, Divider } from 'antd';
import { DownloadOutlined, DollarOutlined } from '@ant-design/icons';
import type { CostSummary } from '../../types';

const { Title, Text } = Typography;

interface ResultDisplayProps {
  result: CostSummary;
  onExport?: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onExport }) => {
  const breakdownData = [
    {
      key: 'storage',
      name: '存储费用',
      monthly: result.breakdown.storage_cost,
      yearly: result.breakdown.storage_cost * 12,
      percent: (result.breakdown.storage_cost / result.monthly_total) * 100,
    },
    {
      key: 'put',
      name: 'PUT 请求费用',
      monthly: result.breakdown.put_request_cost,
      yearly: result.breakdown.put_request_cost * 12,
      percent: (result.breakdown.put_request_cost / result.monthly_total) * 100,
    },
    {
      key: 'get',
      name: 'GET 请求费用',
      monthly: result.breakdown.get_request_cost,
      yearly: result.breakdown.get_request_cost * 12,
      percent: (result.breakdown.get_request_cost / result.monthly_total) * 100,
    },
    ...(result.breakdown.retrieval_cost > 0
      ? [
          {
            key: 'retrieval',
            name: '检索费用',
            monthly: result.breakdown.retrieval_cost,
            yearly: result.breakdown.retrieval_cost * 12,
            percent: (result.breakdown.retrieval_cost / result.monthly_total) * 100,
          },
        ]
      : []),
    ...(result.breakdown.data_transfer_cost > 0
      ? [
          {
            key: 'transfer',
            name: '数据传输费用',
            monthly: result.breakdown.data_transfer_cost,
            yearly: result.breakdown.data_transfer_cost * 12,
            percent: (result.breakdown.data_transfer_cost / result.monthly_total) * 100,
          },
        ]
      : []),
    ...(result.breakdown.lifecycle_cost > 0
      ? [
          {
            key: 'lifecycle',
            name: '生命周期转换费用',
            monthly: result.breakdown.lifecycle_cost,
            yearly: result.breakdown.lifecycle_cost * 12,
            percent: (result.breakdown.lifecycle_cost / result.monthly_total) * 100,
          },
        ]
      : []),
  ];

  const columns = [
    {
      title: '费用类型',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '月度费用',
      dataIndex: 'monthly',
      key: 'monthly',
      render: (val: number) => `$${val.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '年度费用',
      dataIndex: 'yearly',
      key: 'yearly',
      render: (val: number) => `$${val.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '占比',
      dataIndex: 'percent',
      key: 'percent',
      render: (val: number) => `${val.toFixed(1)}%`,
      align: 'right' as const,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <DollarOutlined /> 成本计算结果
          </Title>
        </Col>
        <Col>
          {onExport && (
            <Button type="primary" icon={<DownloadOutlined />} onClick={onExport}>
              导出 Excel
            </Button>
          )}
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="月度总费用"
              value={result.monthly_total}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="年度总费用"
              value={result.yearly_total}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="单设备月均费用"
              value={result.per_device_monthly}
              precision={4}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="设备数量"
              value={result.device_count}
              suffix="台"
            />
          </Card>
        </Col>
      </Row>

      <Divider orientationMargin="0"><Text strong>费用明细</Text></Divider>

      <Table
        dataSource={breakdownData}
        columns={columns}
        pagination={false}
        summary={() => (
          <Table.Summary.Row style={{ background: '#fafafa' }}>
            <Table.Summary.Cell index={0}>
              <Text strong>合计</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <Text strong>${result.monthly_total.toFixed(2)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <Text strong>${result.yearly_total.toFixed(2)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Text strong>100%</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      {result.metrics && (
        <>
          <Divider orientationMargin="0"><Text strong>使用量指标</Text></Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="月度存储量"
                  value={result.metrics.avg_storage_gb}
                  precision={2}
                  suffix="GB"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="月度 PUT 请求"
                  value={result.metrics.monthly_puts}
                  precision={0}
                  suffix="次"
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="月度数据传输"
                  value={result.metrics.monthly_transfer_gb}
                  precision={2}
                  suffix="GB"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default ResultDisplay;
