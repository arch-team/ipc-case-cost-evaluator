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
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

// 样式常量
const styles = {
  // 渐变标题样式
  heroTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 16,
    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  // 主按钮样式
  primaryButton: {
    height: 48,
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
    border: 'none',
    boxShadow: '0 4px 15px rgba(24, 144, 255, 0.4)',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  // 功能卡片样式
  featureCard: {
    height: '100%',
    textAlign: 'center' as const,
    borderRadius: 12,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid #f0f0f0',
  },
  // 图标容器样式
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

const Home: React.FC = () => {
  const navigate = useNavigate();

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
    <div>
      {/* Hero 区域 */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          overflow: 'hidden',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Row align="middle" gutter={[24, 24]}>
          {/* 主内容区 - 移动端全宽，平板 16/24，桌面 16/24 */}
          <Col xs={24} sm={24} md={16} lg={16}>
            <h1 style={styles.heroTitle}>
              IPC 云存储成本评估系统
            </h1>
            <Paragraph style={{ fontSize: 16, marginBottom: 24, color: '#666' }}>
              专为网络摄像头（IPC）视频监控场景设计的 AWS S3 存储成本评估工具。
              支持多种录像模式、视频质量和存储策略的成本计算与对比。
            </Paragraph>
            <Space wrap size="middle">
              <Button
                type="primary"
                size="large"
                icon={<CalculatorOutlined />}
                className="home-primary-btn"
                style={styles.primaryButton}
                onClick={() => navigate('/calculator')}
              >
                开始评估 <ArrowRightOutlined />
              </Button>
              <Button
                size="large"
                style={{ height: 48, borderRadius: 8 }}
                onClick={() => navigate('/evaluations')}
              >
                查看历史记录
              </Button>
            </Space>
          </Col>
          {/* 统计区 - 移动端全宽，平板 8/24，桌面 8/24 */}
          <Col xs={24} sm={24} md={8} lg={8}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={12}>
                <Card
                  size="small"
                  className="home-stat-card"
                  style={{
                    background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)',
                    border: 'none',
                    borderRadius: 12,
                  }}
                >
                  <Statistic
                    title="支持存储类型"
                    value={2}
                    suffix="种"
                    valueStyle={{ color: '#1890ff', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12}>
                <Card
                  size="small"
                  className="home-stat-card"
                  style={{
                    background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                    border: 'none',
                    borderRadius: 12,
                  }}
                >
                  <Statistic
                    title="支持区域"
                    value={10}
                    suffix="+"
                    valueStyle={{ color: '#52c41a', fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 功能卡片区 - 移动端 1 列，平板 2 列，桌面 4 列 */}
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
};

export default Home;
