/**
 * 首页
 */
import React, { useRef, useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Space, Tour, Steps, Skeleton, List, Empty } from 'antd';
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
  UserOutlined,
  HistoryOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { calculationRecordApi } from '../api/calculationRecords';
import { adminApi } from '../api/adminApi';
import { STORAGE_CLASS_METADATA } from '../constants/storageClasses';
import type { CalculationRecordSummary } from '../types/calculationRecords';
import type { SystemStats as SystemStatsType } from '../types/auth';
import { devLog } from '../utils/errors';

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
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [tourOpen, setTourOpen] = useState(false);

  // 用户个性化数据状态
  const [recentRecords, setRecentRecords] = useState<CalculationRecordSummary[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [userDataLoading, setUserDataLoading] = useState(false);

  // 管理员系统统计状态
  const [systemStats, setSystemStats] = useState<SystemStatsType | null>(null);
  const [adminDataLoading, setAdminDataLoading] = useState(false);

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

  // 加载用户个性化数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated) return;

      setUserDataLoading(true);
      try {
        // 并行加载记录数量和最近记录
        const [countRes, listRes] = await Promise.all([
          calculationRecordApi.getCount(),
          calculationRecordApi.list({ page: 1, page_size: 3, sort_by: 'created_at', sort_order: 'desc' }),
        ]);
        setRecordCount(countRes.count);
        setRecentRecords(listRes.items);
      } catch (error) {
        devLog.error('加载用户数据失败:', error);
      } finally {
        setUserDataLoading(false);
      }
    };
    loadUserData();
  }, [isAuthenticated]);

  // 加载管理员系统统计数据
  useEffect(() => {
    const loadAdminData = async () => {
      if (!isAdmin) return;

      setAdminDataLoading(true);
      try {
        const stats = await adminApi.getStats();
        setSystemStats(stats);
      } catch (error) {
        devLog.error('加载系统统计失败:', error);
      } finally {
        setAdminDataLoading(false);
      }
    };
    loadAdminData();
  }, [isAdmin]);

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
                    value={STORAGE_CLASS_METADATA.length}
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
                    value={30}
                    valueStyle={{ color: '#52c41a', fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 用户个性化区域 - 仅登录用户可见 */}
      {isAuthenticated && user && (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 16,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
          }}
        >
          <Row gutter={[24, 24]} align="middle">
            {/* 欢迎信息 */}
            <Col xs={24} md={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 24,
                  }}
                >
                  <UserOutlined />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
                    欢迎回来，{user.name || user.email?.split('@')[0]}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    继续您的成本评估工作
                  </Text>
                </div>
              </div>
            </Col>

            {/* 使用统计 */}
            <Col xs={12} md={4}>
              <Skeleton loading={userDataLoading} paragraph={false} active>
                <Statistic
                  title="已保存记录"
                  value={recordCount}
                  suffix="条"
                  valueStyle={{ color: '#1890ff', fontWeight: 600 }}
                  prefix={<FileTextOutlined />}
                />
              </Skeleton>
            </Col>

            {/* 快捷操作 */}
            <Col xs={24} md={12}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<CalculatorOutlined />}
                  onClick={() => navigate('/calculator')}
                >
                  新建计算
                </Button>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={() => navigate('/detailed-calculation')}
                >
                  详细核算
                </Button>
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => navigate('/calculation-records')}
                >
                  查看记录
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 最近记录列表 */}
          {recentRecords.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ fontSize: 14 }}>
                  <ClockCircleOutlined style={{ marginRight: 8 }} />
                  最近记录
                </Text>
                <Button type="link" size="small" onClick={() => navigate('/calculation-records')}>
                  查看全部 <ArrowRightOutlined />
                </Button>
              </div>
              <List
                size="small"
                dataSource={recentRecords}
                renderItem={(record) => (
                  <List.Item
                    style={{ padding: '8px 0', cursor: 'pointer' }}
                    onClick={() => navigate(`/calculation-records/${record.record_id}`)}
                  >
                    <List.Item.Meta
                      title={
                        <span style={{ fontSize: 13 }}>
                          {record.name}
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            ${record.total_cost?.toFixed(2)}/月
                          </Text>
                        </span>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(record.created_at).toLocaleDateString('zh-CN')}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* 无记录时的提示 */}
          {!userDataLoading && recentRecords.length === 0 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无核算记录"
                style={{ margin: '12px 0' }}
              >
                <Button type="primary" onClick={() => navigate('/detailed-calculation')}>
                  创建第一条记录
                </Button>
              </Empty>
            </div>
          )}
        </Card>
      )}

      {/* 管理员系统概览 */}
      {isAdmin && systemStats && (
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 16,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            background: 'linear-gradient(135deg, #fffbe6 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DashboardOutlined style={{ fontSize: 20, color: '#faad14' }} />
              <Title level={5} style={{ margin: 0 }}>系统概览</Title>
            </div>
            <Button type="link" onClick={() => navigate('/admin/system')}>
              详细监控 <ArrowRightOutlined />
            </Button>
          </div>

          <Skeleton loading={adminDataLoading} paragraph={false} active>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="总用户数"
                  value={systemStats.total_users}
                  prefix={<TeamOutlined />}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="活跃用户"
                  value={systemStats.active_users}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="管理员"
                  value={systemStats.admin_count}
                  prefix={<SafetyCertificateOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="评估记录"
                  value={systemStats.total_evaluations}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="分享链接"
                  value={systemStats.total_shares}
                />
              </Col>
              <Col xs={24} sm={8} md={4}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Button block icon={<TeamOutlined />} onClick={() => navigate('/admin')}>
                    用户管理
                  </Button>
                  <Button block icon={<DollarOutlined />} onClick={() => navigate('/admin/pricing')}>
                    定价管理
                  </Button>
                </Space>
              </Col>
            </Row>
          </Skeleton>
        </Card>
      )}

      {/* 快速开始步骤 - 访客可见 */}
      {!isAuthenticated && (
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
      )}

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
