/**
 * 价格维度配置表单
 */
import React from 'react';
import { Form, Select, InputNumber, Typography, Row, Col, Tooltip, Card } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { PricingDimensions } from '../../types';

const { Title, Text, Paragraph } = Typography;

interface PricingFormProps {
  value: PricingDimensions;
  onChange: (value: PricingDimensions) => void;
}

const regionOptions = [
  { value: 'us-east-1', label: '美国东部 (弗吉尼亚北部)' },
  { value: 'us-west-2', label: '美国西部 (俄勒冈)' },
  { value: 'eu-west-1', label: '欧洲 (爱尔兰)' },
  { value: 'eu-central-1', label: '欧洲 (法兰克福)' },
  { value: 'ap-northeast-1', label: '亚太地区 (东京)' },
  { value: 'ap-northeast-2', label: '亚太地区 (首尔)' },
  { value: 'ap-southeast-1', label: '亚太地区 (新加坡)' },
  { value: 'ap-southeast-2', label: '亚太地区 (悉尼)' },
  { value: 'ap-south-1', label: '亚太地区 (孟买)' },
  { value: 'cn-north-1', label: '中国 (北京)' },
  { value: 'cn-northwest-1', label: '中国 (宁夏)' },
];

const PricingForm: React.FC<PricingFormProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof PricingDimensions, val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div>
      <Title level={4}>价格维度配置</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        选择 AWS 区域和设置折扣
      </Text>

      <Form layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              label={
                <span>
                  AWS 区域{' '}
                  <Tooltip title="选择数据存储的 AWS 区域，不同区域价格略有差异">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Select
                value={value.region}
                onChange={(val) => handleChange('region', val)}
                options={regionOptions}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label={
                <span>
                  折扣比例{' '}
                  <Tooltip title="如果有企业折扣或预留容量折扣，请在此输入折扣百分比">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                min={0}
                max={50}
                value={value.discount_percent}
                onChange={(val) => handleChange('discount_percent', val || 0)}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Card style={{ marginTop: 16, background: '#fafafa' }}>
        <Title level={5}>定价说明</Title>
        <Paragraph>
          <ul>
            <li>
              <Text strong>区域选择</Text>：建议选择距离用户最近的区域，以降低延迟和传输成本
            </li>
            <li>
              <Text strong>企业折扣</Text>：大批量使用可联系 AWS 获取企业折扣
            </li>
            <li>
              <Text strong>预留容量</Text>：确定用量后可购买预留容量获得折扣
            </li>
          </ul>
        </Paragraph>
      </Card>
    </div>
  );
};

export default PricingForm;
