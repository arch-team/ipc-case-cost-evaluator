/**
 * 设置页面
 *
 * 包含用户认证（登录/注册）和系统设置。
 */
import React, { useState, useMemo } from 'react';
import { Card, Typography, Descriptions, Tag, Row, Col, Tabs, Button, Divider, message, Modal, Form, Input, Progress } from 'antd';
import { UserOutlined, LogoutOutlined, EditOutlined, InfoCircleOutlined, SaveOutlined, CheckCircleFilled, CloseCircleFilled, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';
import { LoginForm, RegisterForm } from '../components/auth';
import { ROLE_LABELS } from '../types/auth';
import type { UserUpdateRequest } from '../types/auth';

const { Title, Text, Paragraph } = Typography;

// 样式常量
const styles = {
  // 页面标题样式
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
    background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  // 卡片样式
  card: {
    borderRadius: 16,
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    height: '100%',
  } as React.CSSProperties,
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
  // 卡片标题样式
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 20,
  } as React.CSSProperties,
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

  // 渲染用户信息卡片
  const renderUserCard = () => {
    if (!isAuthenticated || !user) {
      return (
        <Card className="settings-card">
          <div className="settings-card-title">
            <div
              className="settings-card-icon"
              style={{ background: 'linear-gradient(135deg, #1890ff15 0%, #1890ff30 100%)' }}
            >
              <UserOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>账号登录</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>登录后可保存评估记录</Text>
            </div>
          </div>
          <Tabs
            activeKey={authTab}
            onChange={(key) => setAuthTab(key as 'login' | 'register')}
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
                label: '注册',
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
      );
    }

    return (
      <Card className="settings-card">
        <div className="settings-card-title">
          <div
            className="settings-card-icon"
            style={{ background: 'linear-gradient(135deg, #52c41a15 0%, #52c41a30 100%)' }}
          >
            <UserOutlined style={{ fontSize: 20, color: '#52c41a' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>个人信息</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>管理您的账号设置</Text>
          </div>
        </div>
        <Descriptions
          bordered
          column={1}
          size="small"
          labelStyle={{ background: '#fafafa', fontWeight: 500 }}
          contentStyle={{ background: '#fff' }}
        >
          <Descriptions.Item label="用户名">{user.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={user.role === 'admin' ? 'red' : 'blue'}>
              {ROLE_LABELS[user.role]}
            </Tag>
          </Descriptions.Item>
          {user.created_at && (
            <Descriptions.Item label="注册时间">
              {new Date(user.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          )}
        </Descriptions>
        <Divider style={{ margin: '20px 0' }} />
        <div className="settings-actions" style={{ display: 'flex', gap: 12 }}>
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditModalOpen(true)}
            style={{ borderRadius: 8, flex: 1 }}
          >
            编辑信息
          </Button>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            danger
            style={{ borderRadius: 8, flex: 1 }}
          >
            退出登录
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="settings-page">
      {/* 页面标题 */}
      <div className="settings-page-header">
        <h1 className="settings-page-title">设置</h1>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          管理您的账号和查看系统信息
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* 用户认证/信息 */}
        <Col xs={24} lg={12}>
          {renderUserCard()}
        </Col>

        {/* 系统设置 */}
        <Col xs={24} lg={12}>
          <Card style={styles.card}>
            <div style={styles.cardTitle}>
              <div style={styles.titleIcon('#722ed1')}>
                <InfoCircleOutlined style={{ fontSize: 20, color: '#722ed1' }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>系统信息</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>查看系统配置和版本</Text>
              </div>
            </div>
            <Descriptions
              bordered
              column={1}
              size="small"
              labelStyle={{ background: '#fafafa', fontWeight: 500 }}
              contentStyle={{ background: '#fff' }}
            >
              <Descriptions.Item label="API 地址">
                <Text copyable style={{ fontSize: 13 }}>
                  {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                <Tag color="blue">v2.0.0</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="环境">
                <Tag color={import.meta.env.DEV ? 'orange' : 'green'}>
                  {import.meta.env.DEV ? '开发环境' : '生产环境'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

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
        styles={{
          content: { borderRadius: 16, padding: '24px' },
          header: { borderBottom: 'none', paddingBottom: 16 },
        }}
        width={420}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
          initialValues={{ name: user?.name }}
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
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
                      minWidth: 50
                    }}>
                      {editPasswordStrength.text}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: editPassword.length >= 8 ? '#52c41a' : '#bfbfbf' }}>
                      {editPassword.length >= 8 ? <CheckCircleFilled /> : <CloseCircleFilled />} 8位以上
                    </span>
                    <span style={{ color: /[A-Za-z]/.test(editPassword) ? '#52c41a' : '#bfbfbf' }}>
                      {/[A-Za-z]/.test(editPassword) ? <CheckCircleFilled /> : <CloseCircleFilled />} 含字母
                    </span>
                    <span style={{ color: /[0-9]/.test(editPassword) ? '#52c41a' : '#bfbfbf' }}>
                      {/[0-9]/.test(editPassword) ? <CheckCircleFilled /> : <CloseCircleFilled />} 含数字
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
