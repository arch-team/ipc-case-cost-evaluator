/**
 * 快速开始步骤组件
 * 为访客展示使用流程
 */
import { Card, Typography, Steps } from 'antd';
import {
  CheckCircleOutlined,
  SettingOutlined,
  CloudServerOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export function QuickStartSteps() {
  const quickStartSteps = [
    {
      title: '配置参数',
      description: '设置设备数量、视频质量等',
      icon: <SettingOutlined />,
      color: '#1890ff',
    },
    {
      title: '选择存储',
      description: '选择 S3 存储类型和策略',
      icon: <CloudServerOutlined />,
      color: '#52c41a',
    },
    {
      title: '查看结果',
      description: '获取详细成本分析报告',
      icon: <BarChartOutlined />,
      color: '#722ed1',
    },
  ];

  return (
    <Card
      style={{
        marginBottom: 24,
        borderRadius: 16,
        border: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          快速开始
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          只需三步，即可获取完整的成本评估报告
        </Text>
      </div>
      <Steps
        items={quickStartSteps.map((step) => ({
          title: step.title,
          description: step.description,
          icon: (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${step.color}20 0%, ${step.color}40 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: step.color,
              }}
            >
              {step.icon}
            </div>
          ),
        }))}
        style={{ padding: '8px 0' }}
      />
    </Card>
  );
}