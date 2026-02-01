/**
 * Hero 区域组件
 * 包含标题、描述、主要操作按钮和统计卡片
 */
import React from 'react';
import { Card, Row, Col, Statistic, Button, Typography, Space, Tooltip } from 'antd';
import {
  CalculatorOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined,
  HistoryOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { STORAGE_CLASS_METADATA } from '../../constants/storageClasses';
import { useAuth } from '../../hooks/useAuth';

const { Paragraph } = Typography;

interface HeroSectionProps {
  startBtnRef: React.RefObject<HTMLButtonElement | null>;
  historyBtnRef: React.RefObject<HTMLButtonElement | null>;
  onRestartTour: () => void;
}

// 样式常量
const styles = {
  heroTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 16,
    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
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
};

export function HeroSection({ startBtnRef, historyBtnRef, onRestartTour }: HeroSectionProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
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
        {/* 主内容区 */}
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
              onClick={() => navigate('/cost-analysis')}
            >
              开始评估 <ArrowRightOutlined />
            </Button>
            {isAuthenticated ? (
              <Button
                ref={historyBtnRef}
                size="large"
                icon={<HistoryOutlined />}
                style={{ height: 48, borderRadius: 8 }}
                onClick={() => navigate('/history')}
              >
                查看历史记录
              </Button>
            ) : (
              <Tooltip title="登录后可保存和查看评估历史">
                <Button
                  ref={historyBtnRef}
                  size="large"
                  icon={<LoginOutlined />}
                  style={{ height: 48, borderRadius: 8 }}
                  onClick={() => navigate('/settings')}
                >
                  登录以保存记录
                </Button>
              </Tooltip>
            )}
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={onRestartTour}
              style={{ color: '#999' }}
            >
              使用引导
            </Button>
          </Space>
        </Col>
        {/* 统计区 */}
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
  );
}