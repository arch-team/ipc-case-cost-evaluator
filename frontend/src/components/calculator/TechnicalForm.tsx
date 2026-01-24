/**
 * 技术维度配置表单
 */
import React from 'react';
import { Form, Radio, Typography, Card, Row, Col, Tag } from 'antd';
import type { TechnicalDimensions, StorageClass } from '../../types';

const { Title, Text, Paragraph } = Typography;

interface TechnicalFormProps {
  value: TechnicalDimensions;
  onChange: (value: TechnicalDimensions) => void;
}

const storageClassOptions = [
  {
    value: 'STANDARD',
    label: 'S3 Standard',
    description: '适用于频繁访问的数据，低延迟、高吞吐量',
    features: ['毫秒级访问', '99.99% 可用性', '无检索费用'],
    color: 'blue',
  },
  {
    value: 'GLACIER_IR',
    label: 'S3 Glacier Instant Retrieval',
    description: '适用于很少访问但需要毫秒级检索的长期存储数据',
    features: ['毫秒级检索', '存储成本低 68%', '有检索费用'],
    color: 'purple',
  },
];

const TechnicalForm: React.FC<TechnicalFormProps> = ({ value, onChange }) => {
  const handleChange = (storageClass: StorageClass) => {
    onChange({ ...value, storage_class: storageClass });
  };

  return (
    <div>
      <Title level={4}>技术维度配置</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        选择适合您使用场景的存储类型
      </Text>

      <Form layout="vertical">
        <Form.Item label="存储类型">
          <Radio.Group
            value={value.storage_class}
            onChange={(e) => handleChange(e.target.value)}
            style={{ width: '100%' }}
          >
            <Row gutter={16}>
              {storageClassOptions.map((option) => (
                <Col span={12} key={option.value}>
                  <Radio.Button
                    value={option.value}
                    style={{
                      height: 'auto',
                      width: '100%',
                      padding: 0,
                      border: value.storage_class === option.value ? `2px solid #1890ff` : undefined,
                    }}
                  >
                    <Card
                      bordered={false}
                      style={{
                        background: value.storage_class === option.value ? '#e6f7ff' : undefined,
                      }}
                    >
                      <Title level={5}>
                        <Tag color={option.color}>{option.label}</Tag>
                      </Title>
                      <Paragraph type="secondary">{option.description}</Paragraph>
                      <div>
                        {option.features.map((feature, index) => (
                          <Tag key={index} style={{ marginBottom: 4 }}>
                            {feature}
                          </Tag>
                        ))}
                      </div>
                    </Card>
                  </Radio.Button>
                </Col>
              ))}
            </Row>
          </Radio.Group>
        </Form.Item>
      </Form>

      <Card style={{ marginTop: 16, background: '#fafafa' }}>
        <Title level={5}>存储类型选择建议</Title>
        <Paragraph>
          <ul>
            <li>
              <Text strong>回看比例 &gt; 10%</Text>：推荐 S3 Standard，避免高额检索费用
            </li>
            <li>
              <Text strong>回看比例 &lt; 10%</Text>：推荐 S3 Glacier IR，存储成本更低
            </li>
            <li>
              <Text strong>混合策略</Text>：可使用生命周期策略，先存 Standard，过期后转 Glacier IR
            </li>
          </ul>
        </Paragraph>
      </Card>
    </div>
  );
};

export default TechnicalForm;
