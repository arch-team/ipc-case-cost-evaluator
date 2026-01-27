/**
 * 设置页面 - 增强版
 *
 * 功能增强:
 * - 修正页面标题与内容一致性
 * - 增强的系统信息面板（API状态、会话信息）
 * - 开发环境徽章
 * - 增强的 Tabs 动画
 * - 无障碍性支持
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Card, Typography, Tag, Row, Col, Tabs, Button, message, Modal, Form, Input, Progress, Collapse, Switch, Select } from 'antd';
import { UserOutlined, LogoutOutlined, EditOutlined, InfoCircleOutlined, SaveOutlined, CheckCircleFilled, CloseCircleFilled, LockOutlined, SettingOutlined, BellOutlined, GlobalOutlined, ExclamationCircleOutlined, ApiOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';
import { LoginForm, RegisterForm } from '../components/auth';
import { ROLE_LABELS } from '../types/auth';
import type { UserUpdateRequest } from '../types/auth';
import { REGION_SELECT_OPTIONS } from '../constants/regions';

const { Text, Paragraph } = Typography;

// 样式常量
const styles = {
  // 卡片标题图标容器
  titleIcon: (color: string) => ({
    width: 40,
    height: 40,
    borderRadius: 10,
    background: `linear-gradient(135deg, ${color}15 0%, ${color}30 100%)`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as React.CSSProperties),
  // 弹窗输入框样式
  modalInput: {
    borderRadius: 8,
    height: 42,
  } as React.CSSProperties,
  // 弹窗按钮样式
  modalButton: {
    height: 42,
    borderRadius: 8,
    fontWeight: 600,
  } as React.CSSProperties,
};

// 密码强度计算
const calculatePasswordStrength = (password: string): { score: number; text: string; color: string } => {
  if (!password) return { score: 0, text: '', color: '' };

  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score < 30) return { score, text: '弱', color: '#ff4d4f' };
  if (score < 60) return { score, text: '中', color: '#faad14' };
  if (score < 80) return { score, text: '强', color: '#52c41a' };
  return { score: 100, text: '非常强', color: '#1890ff' };
};

// API 状态检查 Hook
const useApiStatus = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    const checkApi = async () => {
      try {
        // 简单的 API 健康检查
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/health`);
        setStatus(response.ok ? 'connected' : 'disconnected');
      } catch {
        setStatus('disconnected');
      }
    };

    checkApi();
    // 每 30 秒检查一次
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  return status;
};

// 环境徽章组件
const EnvBadge: React.FC = () => {
  const isDev = import.meta.env.DEV;

  if (!isDev) return null;

  return (
    <div className={`env-badge ${isDev ? 'dev' : 'prod'}`}>
      {isDev ? 'DEV' : 'PROD'}
    </div>
  );
};

// 系统信息面板组件
const SystemInfoPanel: React.FC<{ expanded?: boolean }> = ({ expanded = false }) => {
  const apiStatus = useApiStatus();
  const sessionStart = useMemo(() => new Date().toLocaleString('zh-CN'), []);

  const getApiStatusDisplay = () => {
    switch (apiStatus) {
      case 'connected':
        return (
          <span className="api-status connected">
            <span className="status-dot" />
            已连接
          </span>
        );
      case 'disconnected':
        return (
          <span className="api-status disconnected">
            <span className="status-dot" />
            未连接
          </span>
        );
      default:
        return (
          <Tag color="processing">检查中...</Tag>
        );
    }
  };

  return (
    <div className="system-info-panel">
      <div className="system-info-item">
        <span className="system-info-label">
          <ApiOutlined style={{ marginRight: 6 }} />
          API 状态
        </span>
        <span className="system-info-value">{getApiStatusDisplay()}</span>
      </div>
      <div className="system-info-item">
        <span className="system-info-label">
          <InfoCircleOutlined style={{ marginRight: 6 }} />
          版本
        </span>
        <span className="system-info-value">
          <Tag color="blue">v2.0.0</Tag>
        </span>
      </div>
      <div className="system-info-item">
        <span className="system-info-label">
          <SettingOutlined style={{ marginRight: 6 }} />
          环境
        </span>
        <span className="system-info-value">
          <Tag color={import.meta.env.DEV ? 'orange' : 'green'}>
            {import.meta.env.DEV ? '开发环境' : '生产环境'}
          </Tag>
        </span>
      </div>
      {expanded && (
        <>
          <div className="system-info-item">
            <span className="system-info-label">
              <ClockCircleOutlined style={{ marginRight: 6 }} />
              会话开始
            </span>
            <span className="system-info-value" style={{ fontSize: 12 }}>
              {sessionStart}
            </span>
          </div>
          <div className="system-info-item">
            <span className="system-info-label">API 地址</span>
            <Text copyable style={{ fontSize: 11 }}>
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}
            </Text>
          </div>
        </>
      )}
    </div>
  );
};

const Settings: React.FC = () => {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [form] = Form.useForm();

  // 编辑弹窗密码强度
  const editPasswordStrength = useMemo(() => calculatePasswordStrength(editPassword), [editPassword]);

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
  };

  const handleAuthSuccess = () => {
    message.success(authTab === 'login' ? '登录成功' : '注册成功');
  };

  const handleEditSubmit = async (values: { name?: string; password?: string }) => {
    if (!values.name && !values.password) {
      message.warning('请至少修改一项');
      return;
    }

    setEditLoading(true);
    try {
      const updateData: UserUpdateRequest = {};
      if (values.name) updateData.name = values.name;
      if (values.password) updateData.password = values.password;

      const updatedUser = await authApi.updateUser(updateData);
      updateUser(updatedUser);
      message.success('信息更新成功');
      setEditModalOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '更新失败';
      message.error(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  // 未登录状态：居中显示登录卡片
  if (!isAuthenticated || !user) {
    return (
      <div className="settings-page">
        {/* 开发环境徽章 */}
        <EnvBadge />

        {/* 页面标题 - 修正为正确的标题 */}
        <div className="settings-page-header" style={{ textAlign: 'center' }}>
          <h1 className="settings-page-title">设置</h1>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            请先登录以访问设置功能
          </Paragraph>
          <div className="settings-page-subtitle">
            登录后可保存和管理您的评估记录
          </div>
        </div>

        {/* 登录提示 */}
        <div style={{ maxWidth: 420, margin: '0 auto 20px' }}>
          <div className="login-prompt-card">
            <ExclamationCircleOutlined />
            <div className="prompt-text">
              设置页面需要登录才能访问完整功能
            </div>
          </div>
        </div>

        {/* 居中的登录卡片 */}
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <Card className="settings-card auth-card">
            <Tabs
              activeKey={authTab}
              onChange={(key) => setAuthTab(key as 'login' | 'register')}
              centered
              className="auth-tabs"
              items={[
                {
                  key: 'login',
                  label: '登录',
                  children: (
                    <LoginForm
                      onSuccess={handleAuthSuccess}
                      onSwitchToRegister={() => setAuthTab('register')}
                    />
                  ),
                },
                {
                  key: 'register',
                  label: (
                    <span>
                      注册
                      <span className="new-user-badge">新用户</span>
                    </span>
                  ),
                  children: (
                    <RegisterForm
                      onSuccess={handleAuthSuccess}
                      onSwitchToLogin={() => setAuthTab('login')}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </div>

        {/* 底部系统信息 - 开发环境默认展开 */}
        <div style={{ maxWidth: 420, margin: '24px auto 0' }}>
          <Collapse
            ghost
            defaultActiveKey={import.meta.env.DEV ? ['system'] : []}
            items={[
              {
                key: 'system',
                label: (
                  <span style={{ color: '#999', fontSize: 13 }}>
                    <InfoCircleOutlined style={{ marginRight: 6 }} />
                    系统信息
                  </span>
                ),
                children: <SystemInfoPanel expanded={false} />,
              },
            ]}
          />
        </div>
      </div>
    );
  }

  // 已登录状态：个人信息 + 偏好设置
  return (
    <div className="settings-page settings-page-v2">
      {/* 开发环境徽章 */}
      <EnvBadge />

      {/* 页面标题 */}
      <div className="settings-page-header">
        <h1 className="settings-page-title-v2">设置</h1>
        <Text type="secondary">管理您的账号和偏好设置</Text>
      </div>

      <Row gutter={[24, 24]} align="stretch">
        {/* 个人信息 */}
        <Col xs={24} lg={12}>
          <Card className="settings-card-v2" style={{ height: '100%' }}>
            <div className="settings-card-header-v2">
              <div className="settings-card-icon-v2">
                <UserOutlined />
              </div>
              <div>
                <div className="settings-card-title-v2">个人信息</div>
                <Text type="secondary" style={{ fontSize: 13 }}>管理您的账号信息</Text>
              </div>
            </div>

            <div className="settings-info-list">
              <div className="settings-info-item">
                <span className="settings-info-label">用户名</span>
                <span className="settings-info-value">{user.name}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">邮箱</span>
                <span className="settings-info-value">{user.email}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">角色</span>
                <span className="settings-info-value">
                  <Tag color={user.role === 'admin' ? 'blue' : 'default'} style={{ margin: 0 }}>
                    {ROLE_LABELS[user.role]}
                  </Tag>
                </span>
              </div>
              {user.created_at && (
                <div className="settings-info-item">
                  <span className="settings-info-label">注册时间</span>
                  <span className="settings-info-value">
                    {new Date(user.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
            </div>

            <div className="settings-actions-v2">
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditModalOpen(true)}
              >
                编辑信息
              </Button>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                className="logout-btn"
              >
                退出登录
              </Button>
            </div>
          </Card>
        </Col>

        {/* 偏好设置 */}
        <Col xs={24} lg={12}>
          <Card className="settings-card-v2" style={{ height: '100%' }}>
            <div className="settings-card-header-v2">
              <div className="settings-card-icon-v2">
                <SettingOutlined />
              </div>
              <div>
                <div className="settings-card-title-v2">偏好设置</div>
                <Text type="secondary" style={{ fontSize: 13 }}>自定义您的使用体验</Text>
              </div>
            </div>

            <div className="settings-pref-list">
              {/* 默认区域 */}
              <div className="settings-pref-item">
                <div className="settings-pref-left">
                  <GlobalOutlined className="settings-pref-icon" />
                  <div>
                    <div className="settings-pref-title">默认 AWS 区域</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>计算时使用的默认区域</Text>
                  </div>
                </div>
                <Select
                  defaultValue="ap-northeast-1"
                  style={{ width: 220 }}
                  options={REGION_SELECT_OPTIONS}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>

              {/* 自动计算 */}
              <div className="settings-pref-item">
                <div className="settings-pref-left">
                  <SettingOutlined className="settings-pref-icon" />
                  <div>
                    <div className="settings-pref-title">自动计算</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>修改参数时自动重新计算</Text>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              {/* 消息通知 */}
              <div className="settings-pref-item">
                <div className="settings-pref-left">
                  <BellOutlined className="settings-pref-icon" />
                  <div>
                    <div className="settings-pref-title">消息通知</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>接收系统和更新通知</Text>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 系统信息卡片 */}
      <Card className="settings-card-v2 settings-system-card" style={{ marginTop: 24 }}>
        <div className="settings-card-header-v2">
          <div className="settings-card-icon-v2">
            <InfoCircleOutlined />
          </div>
          <div>
            <div className="settings-card-title-v2">系统信息</div>
            <Text type="secondary" style={{ fontSize: 13 }}>应用运行状态和版本信息</Text>
          </div>
        </div>
        <SystemInfoPanel expanded={true} />
      </Card>

      {/* 编辑用户信息对话框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.titleIcon('#1890ff')}>
              <EditOutlined style={{ fontSize: 18, color: '#1890ff' }} />
            </div>
            <span>编辑个人信息</span>
          </div>
        }
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditPassword('');
          form.resetFields();
        }}
        footer={null}
        style={{ borderRadius: 16 }}
        width={420}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
          initialValues={{ name: user?.name }}
          className="auth-form"
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 500 }}>用户名</span>}
            rules={[{ min: 1, max: 50, message: '用户名长度为 1-50 个字符' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="留空则不修改"
              style={styles.modalInput}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 500 }}>新密码</span>}
            rules={[
              { min: 8, message: '密码长度至少 8 位' },
              {
                pattern: /[A-Za-z]/,
                message: '密码必须包含字母',
              },
              {
                pattern: /[0-9]/,
                message: '密码必须包含数字',
              },
            ]}
            extra={
              editPassword && (
                <div className="password-strength-container" style={{ marginTop: 10 }}>
                  <div className="password-strength-bar">
                    <Progress
                      percent={editPasswordStrength.score}
                      showInfo={false}
                      strokeColor={editPasswordStrength.color}
                      trailColor="#f0f0f0"
                      size="small"
                      style={{ flex: 1, margin: 0 }}
                    />
                    <Text style={{
                      color: editPasswordStrength.color,
                      fontSize: 12,
                      fontWeight: 600,
                      minWidth: 50,
                      textAlign: 'right'
                    }}>
                      {editPasswordStrength.text}
                    </Text>
                  </div>
                  <div className="password-strength-requirements">
                    <span className={`password-requirement ${editPassword.length >= 8 ? 'met' : 'unmet'}`}>
                      {editPassword.length >= 8 ? <CheckCircleFilled /> : <CloseCircleFilled />}
                      <span>8位以上</span>
                    </span>
                    <span className={`password-requirement ${/[A-Za-z]/.test(editPassword) ? 'met' : 'unmet'}`}>
                      {/[A-Za-z]/.test(editPassword) ? <CheckCircleFilled /> : <CloseCircleFilled />}
                      <span>含字母</span>
                    </span>
                    <span className={`password-requirement ${/[0-9]/.test(editPassword) ? 'met' : 'unmet'}`}>
                      {/[0-9]/.test(editPassword) ? <CheckCircleFilled /> : <CloseCircleFilled />}
                      <span>含数字</span>
                    </span>
                  </div>
                </div>
              )
            }
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="留空则不修改密码"
              style={styles.modalInput}
              onChange={(e) => setEditPassword(e.target.value)}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={editLoading}
              icon={!editLoading && <SaveOutlined />}
              block
              style={{
                ...styles.modalButton,
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.35)',
              }}
            >
              {editLoading ? '保存中...' : '保存修改'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
