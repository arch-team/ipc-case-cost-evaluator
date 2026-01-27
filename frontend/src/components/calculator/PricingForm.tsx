/**
 * 价格维度配置表单
 */
import React from 'react';
import { Form, Select, InputNumber, Typography, Row, Col, Tooltip, Card } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { PricingDimensions } from '../../types';

const { Text, Paragraph } = Typography;

interface PricingFormProps {
  value: PricingDimensions;
  onChange: (value: PricingDimensions) => void;
}

const regionOptions = [
  // 美洲
  { value: 'us-east-1', label: '美国东部 (弗吉尼亚北部)' },
  { value: 'us-east-2', label: '美国东部 (俄亥俄)' },
  { value: 'us-west-1', label: '美国西部 (加利福尼亚北部)' },
  { value: 'us-west-2', label: '美国西部 (俄勒冈)' },
  { value: 'ca-central-1', label: '加拿大 (中部)' },
  { value: 'ca-west-1', label: '加拿大西部 (卡尔加里)' },
  { value: 'sa-east-1', label: '南美洲 (圣保罗)' },
  // 欧洲
  { value: 'eu-west-1', label: '欧洲 (爱尔兰)' },
  { value: 'eu-west-2', label: '欧洲 (伦敦)' },
  { value: 'eu-west-3', label: '欧洲 (巴黎)' },
  { value: 'eu-central-1', label: '欧洲 (法兰克福)' },
  { value: 'eu-central-2', label: '欧洲 (苏黎世)' },
  { value: 'eu-north-1', label: '欧洲 (斯德哥尔摩)' },
  { value: 'eu-south-1', label: '欧洲 (米兰)' },
  { value: 'eu-south-2', label: '欧洲 (西班牙)' },
  // 亚太地区
  { value: 'ap-northeast-1', label: '亚太地区 (东京)' },
  { value: 'ap-northeast-2', label: '亚太地区 (首尔)' },
  { value: 'ap-northeast-3', label: '亚太地区 (大阪)' },
  { value: 'ap-southeast-1', label: '亚太地区 (新加坡)' },
  { value: 'ap-southeast-2', label: '亚太地区 (悉尼)' },
  { value: 'ap-southeast-3', label: '亚太地区 (雅加达)' },
  { value: 'ap-southeast-4', label: '亚太地区 (墨尔本)' },
  { value: 'ap-southeast-5', label: '亚太地区 (马来西亚)' },
  { value: 'ap-south-1', label: '亚太地区 (孟买)' },
  { value: 'ap-south-2', label: '亚太地区 (海得拉巴)' },
  { value: 'ap-east-1', label: '亚太地区 (香港)' },
  // 中东和非洲
  { value: 'me-south-1', label: '中东 (巴林)' },
  { value: 'me-central-1', label: '中东 (阿联酋)' },
  { value: 'il-central-1', label: '以色列 (特拉维夫)' },
  { value: 'af-south-1', label: '非洲 (开普敦)' },
];

const PricingForm: React.FC<PricingFormProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof PricingDimensions, val: string | number | null | undefined) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="dimension-form">
      <div className="dimension-form-header">
        <Text strong style={{ fontSize: 14 }}>价格维度配置</Text>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
          选择 AWS 区域和设置折扣
        </Text>
      </div>

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

      <Card size="small" style={{ marginTop: 16, background: '#fafafa' }}>
        <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>定价说明</Text>
        <Paragraph style={{ fontSize: 12, marginBottom: 0 }}>
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
