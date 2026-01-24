/**
 * 方案对比展示组件
 */
import React from 'react';
import { Card, Table, Tag, Typography, Alert, Row, Col } from 'antd';
import { CheckCircleOutlined, SwapOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ComparisonResult, ComparisonItem } from '../../types';
import ComparisonChart from './ComparisonChart';

const { Title, Text, Paragraph } = Typography;

interface ComparisonDisplayProps {
  comparison: ComparisonResult;
}

const ComparisonDisplay: React.FC<ComparisonDisplayProps> = ({ comparison }) => {
  const columns = [
    {
      title: '存储方案',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ComparisonItem) => (
        <span>
          {text}{' '}
          {record.is_recommended && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              推荐
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: '月度费用',
      dataIndex: 'monthly_cost',
      key: 'monthly_cost',
      render: (val: number) => `$${val.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '年度费用',
      dataIndex: 'yearly_cost',
      key: 'yearly_cost',
      render: (val: number) => `$${val.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: '相对基准',
      dataIndex: 'vs_baseline',
      key: 'vs_baseline',
      render: (val: number) => {
        if (val === 0) return '-';
        const percent = (val * 100).toFixed(1);
        return (
          <Tag color={val < 0 ? 'green' : 'red'}>
            {val < 0 ? '' : '+'}
            {percent}%
          </Tag>
        );
      },
      align: 'right' as const,
    },
  ];

  return (
    <div>
      <Title level={4}>
        <SwapOutlined /> 方案对比
      </Title>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        比较不同存储类型的成本，基准方案: {comparison.baseline}
      </Text>

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Table
            dataSource={comparison.items}
            columns={columns}
            pagination={false}
            rowKey="name"
            rowClassName={(record) => (record.is_recommended ? 'ant-table-row-selected' : '')}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={
              <>
                <BarChartOutlined /> 费用对比图
              </>
            }
          >
            <ComparisonChart comparison={comparison} />
          </Card>
        </Col>
      </Row>

      {comparison.recommendation && (
        <Card style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={
                  <span>
                    <Text strong>推荐方案：</Text> {comparison.recommendation.recommended_option}
                  </span>
                }
                description={
                  <div>
                    <Paragraph style={{ marginBottom: 8 }}>
                      {comparison.recommendation.reason}
                    </Paragraph>
                    {comparison.recommendation.potential_savings && (
                      <Text type="success">
                        潜在节省：${comparison.recommendation.potential_savings.toFixed(2)} / 月
                      </Text>
                    )}
                    {comparison.recommendation.suggestions &&
                      comparison.recommendation.suggestions.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong>优化建议：</Text>
                          <ul style={{ marginBottom: 0 }}>
                            {comparison.recommendation.suggestions.map((suggestion, index) => (
                              <li key={index}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                }
              />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default ComparisonDisplay;
