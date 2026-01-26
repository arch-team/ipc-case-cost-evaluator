/**
 * 注册表单组件
 */
import React, { useState, useMemo } from 'react';
import { Form, Input, Button, Alert, Typography, Progress } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

const { Text } = Typography;

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

// 密码强度计算
const calculatePasswordStrength = (password: string): { score: number; text: string; color: string } => {
  let score = 0;

  if (!password) {
    return { score: 0, text: '', color: '' };
  }

  // 长度检查
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;

  // 包含字母
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;

  // 包含数字
  if (/[0-9]/.test(password)) score += 20;

  // 包含特殊字符
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score < 30) return { score, text: '弱', color: '#ff4d4f' };
  if (score < 60) return { score, text: '中', color: '#faad14' };
  if (score < 80) return { score, text: '强', color: '#52c41a' };
  return { score: 100, text: '非常强', color: '#1890ff' };
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [form] = Form.useForm<RegisterFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  const handleSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.register(values.email, values.password, values.name);
      login(response);
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '注册失败，请重试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
    >
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form.Item
        name="name"
        label="用户名"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 1, max: 50, message: '用户名长度为 1-50 个字符' },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="请输入用户名"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="请输入邮箱"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={[
          { required: true, message: '请输入密码' },
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
          password && (
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={passwordStrength.score}
                showInfo={false}
                strokeColor={passwordStrength.color}
                size="small"
              />
              <Text style={{ color: passwordStrength.color, fontSize: 12 }}>
                密码强度: {passwordStrength.text}
              </Text>
            </div>
          )
        }
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="至少 8 位，包含字母和数字"
          size="large"
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="确认密码"
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请再次输入密码"
          size="large"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
        >
          注册
        </Button>
      </Form.Item>

      {onSwitchToLogin && (
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            已有账号？{' '}
            <a onClick={onSwitchToLogin}>立即登录</a>
          </Text>
        </div>
      )}
    </Form>
  );
};

export default RegisterForm;
