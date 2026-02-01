/**
 * 登录引导提示组件
 *
 * 用于在访客模式下引导用户登录/注册
 * 支持多种展示模式：Alert、Card、Inline
 */
import React from 'react';
import { Alert, Button, Card, Space, Typography } from 'antd';
import {
  LoginOutlined,
  UserAddOutlined,
  LockOutlined,
  SaveOutlined,
  ShareAltOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;

export type LoginPromptVariant = 'alert' | 'card' | 'inline' | 'button' | 'mini';

interface LoginPromptProps {
  /** 展示模式 */
  variant?: LoginPromptVariant;
  /** 提示标题 */
  title?: string;
  /** 提示描述 */
  description?: string;
  /** 触发场景（用于显示对应图标和文案） */
  trigger?: 'save' | 'share' | 'history' | 'general';
  /** 是否可关闭（仅 alert 模式） */
  closable?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
}

// 触发场景的默认文案
const triggerMessages: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  save: {
    title: '登录后可保存',
    description: '登录后可以保存计算结果，方便日后查看和对比',
    icon: <SaveOutlined />,
  },
  share: {
    title: '登录后可分享',
    description: '登录后可以生成分享链接，与他人共享评估结果',
    icon: <ShareAltOutlined />,
  },
  history: {
    title: '登录后查看历史',
    description: '登录后可以查看和管理所有历史评估记录',
    icon: <HistoryOutlined />,
  },
  general: {
    title: '访客模式',
    description: '您正在以访客身份使用，部分功能受限',
    icon: <LockOutlined />,
  },
};

// 登录后可解锁的功能列表
const loginBenefits = [
  { icon: <SaveOutlined />, text: '永久保存评估记录' },
  { icon: <ShareAltOutlined />, text: '生成分享链接' },
  { icon: <HistoryOutlined />, text: '查看历史对比' },
];

const LoginPrompt: React.FC<LoginPromptProps> = ({
  variant = 'alert',
  title,
  description,
  trigger = 'general',
  closable = true,
  onClose,
  style,
  className,
}) => {
  const navigate = useNavigate();
  const triggerConfig = triggerMessages[trigger];

  const displayTitle = title || triggerConfig.title;
  const displayDescription = description || triggerConfig.description;

  const handleLogin = () => {
    navigate('/settings', { state: { tab: 'login' } });
  };

  const handleRegister = () => {
    navigate('/settings', { state: { tab: 'register' } });
  };

  // Mini 模式 - 轻量提示条（32px 高度）
  if (variant === 'mini') {
    return (
      <div
        style={{
          height: 32,
          padding: '6px 16px',
          background: '#f0f5ff',
          borderRadius: 4,
          fontSize: 13,
          color: '#595959',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          ...style,
        }}
        className={className}
      >
        <span>
          <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
          访客模式 - 登录后可保存记录
        </span>
        {closable && (
          <CloseOutlined
            onClick={onClose}
            style={{ cursor: 'pointer', fontSize: 12, color: '#8c8c8c' }}
          />
        )}
      </div>
    );
  }

  // Alert 模式 - 页面顶部提示条
  if (variant === 'alert') {
    return (
      <Alert
        message={displayTitle}
        description={
          <span>
            {displayDescription}
            <Button
              type="link"
              icon={<LoginOutlined />}
              onClick={handleLogin}
              style={{ marginLeft: 8, padding: '0 4px' }}
            >
              立即登录
            </Button>
          </span>
        }
        type="info"
        showIcon
        icon={triggerConfig.icon}
        closable={closable}
        onClose={onClose}
        style={{ marginBottom: 16, ...style }}
        className={className}
      />
    );
  }

  // Card 模式 - 卡片式展示（用于空状态或功能入口）
  if (variant === 'card') {
    return (
      <Card
        style={{ textAlign: 'center', ...style }}
        className={className}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ fontSize: 48, color: '#1890ff' }}>
            {triggerConfig.icon}
          </div>
          <div>
            <Text strong style={{ fontSize: 16 }}>{displayTitle}</Text>
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {displayDescription}
            </Paragraph>
          </div>

          <div style={{ textAlign: 'left', maxWidth: 280, margin: '0 auto' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>登录后可以：</Text>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              {loginBenefits.map((benefit, index) => (
                <li key={index} style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                  <Space size={4}>
                    <span style={{ color: '#1890ff' }}>{benefit.icon}</span>
                    {benefit.text}
                  </Space>
                </li>
              ))}
            </ul>
          </div>

          <Space>
            <Button type="primary" icon={<LoginOutlined />} onClick={handleLogin}>
              登录
            </Button>
            <Button icon={<UserAddOutlined />} onClick={handleRegister}>
              注册
            </Button>
          </Space>
        </Space>
      </Card>
    );
  }

  // Inline 模式 - 行内提示（用于按钮旁边）
  if (variant === 'inline') {
    return (
      <span style={{ color: '#999', fontSize: 12, ...style }} className={className}>
        <LockOutlined style={{ marginRight: 4 }} />
        <a onClick={handleLogin} style={{ color: '#1890ff' }}>
          登录
        </a>
        后可使用此功能
      </span>
    );
  }

  // Button 模式 - 替代按钮（用于替换被禁用的功能按钮）
  if (variant === 'button') {
    return (
      <Button
        icon={<LoginOutlined />}
        onClick={handleLogin}
        style={style}
        className={className}
      >
        {displayTitle}
      </Button>
    );
  }

  return null;
};

export default LoginPrompt;
