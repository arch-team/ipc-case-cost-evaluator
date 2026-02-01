/**
 * 登录表单组件 - 增强版
 *
 * 功能增强:
 * - 记住登录状态
 * - 忘记密码链接
 * - 输入框 Focus 增强
 * - 成功动画
 * - 无障碍性支持
 */
import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Checkbox, App } from 'antd';
import { MailOutlined, LockOutlined, LoginOutlined, CheckCircleFilled } from '@ant-design/icons';
import { authApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { authStyles } from '../../constants/styles';

const { Text } = Typography;

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { login } = useAuth();
  const { message } = App.useApp();

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(values.email, values.password);

      // 显示成功动画
      setShowSuccess(true);

      // 延迟执行登录以展示动画
      setTimeout(() => {
        login(response);
        onSuccess?.();
      }, 800);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败，请重试';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // 成功动画
  if (showSuccess) {
    return (
      <div className="auth-success-animation">
        <CheckCircleFilled />
        <span className="success-text">登录成功</span>
      </div>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
      className="auth-form"
      aria-labelledby="login-form-title"
      initialValues={{ remember: true }}
    >
      {/* 屏幕阅读器标题 */}
      <h2 id="login-form-title" className="sr-only">登录表单</h2>

      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          closable={{ onClose: () => setError(null) }}
          style={authStyles.alert}
          role="alert"
        />
      )}

      <Form.Item
        name="email"
        label={<span style={authStyles.formLabel}>邮箱</span>}
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
      >
        <Input
          prefix={<MailOutlined style={authStyles.iconPrefix} />}
          placeholder="请输入邮箱"
          size="large"
          style={authStyles.input}
          autoComplete="email"
          aria-describedby="email-hint"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label={<span style={authStyles.formLabel}>密码</span>}
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<LockOutlined style={authStyles.iconPrefix} />}
          placeholder="请输入密码"
          size="large"
          style={authStyles.input}
          autoComplete="current-password"
        />
      </Form.Item>

      {/* 忘记密码和记住我 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Checkbox>
            <Text type="secondary" style={{ fontSize: 13 }}>记住登录状态</Text>
          </Checkbox>
        </Form.Item>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            message.info('该功能正在开发中，如需重置密码请联系管理员');
          }}
          style={{ fontSize: 13, color: '#666' }}
        >
          忘记密码？
        </a>
      </div>

      <Form.Item style={{ marginBottom: 16, marginTop: 8 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          icon={!loading && <LoginOutlined />}
          block
          size="large"
          style={authStyles.loginButton}
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </Button>
      </Form.Item>

      {onSwitchToRegister && (
        <div className="auth-form-footer">
          <Text type="secondary">
            还没有账号？{' '}
            <a onClick={onSwitchToRegister} style={{ fontWeight: 500 }}>
              立即注册
            </a>
          </Text>
        </div>
      )}
    </Form>
  );
};

export default LoginForm;
