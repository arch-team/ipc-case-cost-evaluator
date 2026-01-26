/**
 * 首页
 */
import React, { useRef, useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Space, Tour, Steps } from 'antd';
import type { TourProps } from 'antd';
import {
  CalculatorOutlined,
  CloudServerOutlined,
  DollarOutlined,
  RocketOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

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

// 本地存储键
const TOUR_COMPLETED_KEY = 'ipc_cost_evaluator_tour_completed';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [tourOpen, setTourOpen] = useState(false);

  // Tour 目标元素引用
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const historyBtnRef = useRef<HTMLButtonElement>(null);
  const featureCardRef = useRef<HTMLDivElement>(null);

  // 检查是否需要显示引导
  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!tourCompleted) {
      // 延迟显示，让页面先渲染完成
      const timer = setTimeout(() => setTourOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Tour 步骤配置
  const tourSteps: TourProps['steps'] = [
    {
      title: '欢迎使用 IPC 成本评估系统',
      description: '这是一个帮助您评估 AWS S3 云存储成本的工具。让我们快速了解一下主要功能。',
      target: null,
      placement: 'center',
    },
    {
      title: '开始成本评估',
      description: '点击这里开始配置您的 IPC 设备参数，系统将自动计算存储成本。',
      target: () => startBtnRef.current!,
      placement: 'bottom',
    },
    {
      title: '查看历史记录',
      description: '您的所有评估记录都会保存在这里，方便随时查看和对比。',
      target: () => historyBtnRef.current!,
      placement: 'bottom',
    },
    {
      title: '核心功能介绍',
      description: '系统支持精准计算、多方案对比、成本优化建议和报告导出等功能。',
      target: () => featureCardRef.current!,
      placement: 'top',
    },
  ];

  // 完成引导
  const handleTourFinish = () => {
    setTourOpen(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  };

  // 重新开始引导
  const handleRestartTour = () => {
    setTourOpen(true);
  };

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

  // 快速开始步骤
  const quickStartSteps = [
    {
      title: '配置参数',
      description: '设置设备数量、视频质量等',
      icon: <SettingOutlined />,
    },
    {
      title: '选择存储',
      description: '选择 S3 存储类型和策略',
      icon: <CloudServerOutlined />,
    },
    {
      title: '查看结果',
      description: '获取详细成本分析报告',
      icon: <BarChartOutlined />,
    },
  ];

  return (
    <div>
      {/* 新用户引导 Tour */}
      <Tour
        open={tourOpen}
        onClose={handleTourFinish}
        onFinish={handleTourFinish}
        steps={tourSteps}
        indicatorsRender={(current, total) => (
          <span>{current + 1} / {total}</span>
        )}
      />

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
                ref={startBtnRef}
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
                ref={historyBtnRef}
                size="large"
                style={{ height: 48, borderRadius: 8 }}
                onClick={() => navigate('/evaluations')}
              >
                查看历史记录
              </Button>
              <Button
                type="text"
                icon={<QuestionCircleOutlined />}
                onClick={handleRestartTour}
                style={{ color: '#999' }}
              >
                使用引导
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

      {/* 快速开始步骤 */}
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
          items={quickStartSteps.map((step, index) => ({
            title: step.title,
            description: step.description,
            icon: (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${['#1890ff', '#52c41a', '#722ed1'][index]}20 0%, ${['#1890ff', '#52c41a', '#722ed1'][index]}40 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ['#1890ff', '#52c41a', '#722ed1'][index],
                }}
              >
                {step.icon}
              </div>
            ),
          }))}
          style={{ padding: '8px 0' }}
        />
      </Card>

      {/* 功能卡片区 - 移动端 1 列，平板 2 列，桌面 4 列 */}
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
    </div>
  );
};

export default Home;
