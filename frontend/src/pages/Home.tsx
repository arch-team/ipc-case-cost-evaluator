/**
 * 首页
 */
import React from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Space } from 'antd';
import {
  CalculatorOutlined,
  CloudServerOutlined,
  DollarOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <CalculatorOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: '精准成本计算',
      description: '基于 AWS S3 官方定价，精确计算存储、请求和传输费用',
    },
    {
      icon: <CloudServerOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: '多方案对比',
      description: '比较 S3 Standard 和 Glacier IR 等存储方案，找到最优解',
    },
    {
      icon: <DollarOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      title: '成本优化建议',
      description: '智能分析使用模式，提供针对性的成本优化建议',
    },
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: '导出报告',
      description: '一键导出 Excel 报告，便于分享和存档',
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={24}>
          <Col span={16}>
            <Title level={2}>IPC 云存储成本评估系统</Title>
            <Paragraph style={{ fontSize: 16 }}>
              专为网络摄像头（IPC）视频监控场景设计的 AWS S3 存储成本评估工具。
              支持多种录像模式、视频质量和存储策略的成本计算与对比。
            </Paragraph>
            <Space>
              <Button
                type="primary"
                size="large"
                icon={<CalculatorOutlined />}
                onClick={() => navigate('/calculator')}
              >
                开始评估
              </Button>
              <Button size="large" onClick={() => navigate('/evaluations')}>
                查看历史记录
              </Button>
            </Space>
          </Col>
          <Col span={8}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="支持存储类型" value={2} suffix="种" />
              </Col>
              <Col span={12}>
                <Statistic title="支持区域" value={10} suffix="+" />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {features.map((feature, index) => (
          <Col span={6} key={index}>
            <Card hoverable style={{ height: '100%', textAlign: 'center' }}>
              <div style={{ marginBottom: 16 }}>{feature.icon}</div>
              <Title level={4}>{feature.title}</Title>
              <Paragraph type="secondary">{feature.description}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default Home;
