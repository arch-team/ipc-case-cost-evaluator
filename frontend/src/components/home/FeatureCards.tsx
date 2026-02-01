/**
 * 功能卡片区组件
 * 展示系统主要功能特性
 */
import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  CalculatorOutlined,
  CloudServerOutlined,
  DollarOutlined,
  RocketOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface FeatureCardsProps {
  featureCardRef: React.RefObject<HTMLDivElement | null>;
}

// 功能卡片样式
const styles = {
  featureCard: {
    height: '100%',
    textAlign: 'center' as const,
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid #f0f0f0',
  },
  iconWrapper: (bgColor: string) => ({
    width: 64,
    height: 64,
    margin: '0 auto 20px',
    borderRadius: 16,
    background: `linear-gradient(135deg, ${bgColor}15 0%, ${bgColor}30 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
};

export function FeatureCards({ featureCardRef }: FeatureCardsProps) {
  const features = [
    {
      icon: <CalculatorOutlined style={{ fontSize: 28, color: '#1890ff' }} />,
      iconBg: '#1890ff',
      title: '精准成本计算',
      description: '基于 AWS S3 官方定价，精确计算存储、请求和传输费用',
    },
    {
      icon: <CloudServerOutlined style={{ fontSize: 28, color: '#52c41a' }} />,
      iconBg: '#52c41a',
      title: '多方案对比',
      description: '比较 S3 Standard 和 Glacier IR 等存储方案，找到最优解',
    },
    {
      icon: <DollarOutlined style={{ fontSize: 28, color: '#faad14' }} />,
      iconBg: '#faad14',
      title: '成本优化建议',
      description: '智能分析使用模式，提供针对性的成本优化建议',
    },
    {
      icon: <RocketOutlined style={{ fontSize: 28, color: '#722ed1' }} />,
      iconBg: '#722ed1',
      title: '导出报告',
      description: '一键导出 Excel 报告，便于分享和存档',
    },
  ];

  return (
    <div ref={featureCardRef}>
      <Row gutter={[16, 16]}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} md={12} lg={6} key={index}>
            <Card
              hoverable
              className="home-feature-card"
              style={styles.featureCard}
              styles={{ body: { padding: 24 } }}
            >
              <div style={styles.iconWrapper(feature.iconBg)}>
                {feature.icon}
              </div>
              <Title level={4} style={{ marginBottom: 12 }}>{feature.title}</Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {feature.description}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}