/**
 * 设置页面
 *
 * 包含用户认证（登录/注册）和系统设置。
 */
import React, { useState } from 'react';
import { Card, Typography, Descriptions, Tag, Row, Col, Tabs, Button, Divider, message, Modal, Form, Input } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/client';
import { LoginForm, RegisterForm } from '../components/auth';
import { ROLE_LABELS } from '../types/auth';
import type { UserUpdateRequest } from '../types/auth';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form] = Form.useForm();

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
        <Card>
          <Title level={4}>
            <UserOutlined style={{ marginRight: 8 }} />
            账号登录
          </Title>
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
      <Card>
        <Title level={4}>
          <UserOutlined style={{ marginRight: 8 }} />
          个人信息
        </Title>
        <Descriptions bordered column={1}>
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
        <Divider />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<EditOutlined />} onClick={() => setEditModalOpen(true)}>
            编辑信息
          </Button>
          <Button icon={<LogoutOutlined />} onClick={handleLogout} danger>
            退出登录
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Row gutter={[24, 24]}>
        {/* 用户认证/信息 */}
        <Col xs={24} lg={12}>
          {renderUserCard()}
        </Col>

        {/* 系统设置 */}
        <Col xs={24} lg={12}>
          <Card>
            <Title level={4}>
              <SettingOutlined style={{ marginRight: 8 }} />
              系统信息
            </Title>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="API 地址">
                <Text copyable>
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
        title="编辑个人信息"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
          initialValues={{ name: user?.name }}
        >
          <Form.Item
            name="name"
            label="用户名"
            rules={[{ min: 1, max: 50, message: '用户名长度为 1-50 个字符' }]}
          >
            <Input placeholder="留空则不修改" />
          </Form.Item>

          <Form.Item
            name="password"
            label="新密码"
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
          >
            <Input.Password placeholder="留空则不修改密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={editLoading} block>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings;
