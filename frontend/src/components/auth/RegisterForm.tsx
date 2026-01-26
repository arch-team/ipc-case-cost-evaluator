/**
 * 注册表单组件 - 增强版
 *
 * 功能增强:
 * - 增强的密码强度指示器（始终显示框架）
 * - 密码要求始终可见
 * - 成功动画
 * - 即时验证
 * - 无障碍性支持
 */
import React, { useState, useMemo } from 'react';
import { Form, Input, Button, Alert, Typography, Progress } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, UserAddOutlined, CheckCircleFilled, CloseCircleFilled, InfoCircleOutlined } from '@ant-design/icons';
import { authApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

const { Text } = Typography;

// 样式常量
const styles = {
  primaryButton: {
    height: 44,
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(82, 196, 26, 0.35)',
  } as React.CSSProperties,
  input: {
    borderRadius: 8,
    height: 44,
  } as React.CSSProperties,
};

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
    return { score: 0, text: '待输入', color: '#d9d9d9' };
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

// 密码要求检查
const checkPasswordRequirements = (password: string) => ({
  length: password.length >= 8,
  hasLetter: /[A-Za-z]/.test(password),
  hasNumber: /[0-9]/.test(password),
});

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [form] = Form.useForm<RegisterFormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { login } = useAuth();

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const passwordRequirements = useMemo(() => checkPasswordRequirements(password), [password]);

  const handleSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.register(values.email, values.password, values.name);

      // 显示成功动画
      setShowSuccess(true);

      // 延迟执行登录以展示动画
      setTimeout(() => {
        login(response);
        onSuccess?.();
      }, 800);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '注册失败，请重试';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // 成功动画
  if (showSuccess) {
    return (
      <div className="auth-success-animation">
        <CheckCircleFilled />
        <span className="success-text">注册成功</span>
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
      aria-labelledby="register-form-title"
    >
      {/* 屏幕阅读器标题 */}
      <h2 id="register-form-title" className="sr-only">注册表单</h2>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16, borderRadius: 8 }}
          role="alert"
        />
      )}

      <Form.Item
        name="name"
        label={<span style={{ fontWeight: 500 }}>用户名</span>}
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 1, max: 50, message: '用户名长度为 1-50 个字符' },
        ]}
      >
        <Input
          prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="请输入用户名"
          size="large"
          style={styles.input}
          autoComplete="username"
        />
      </Form.Item>

      <Form.Item
        name="email"
        label={<span style={{ fontWeight: 500 }}>邮箱</span>}
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
        validateTrigger={['onChange', 'onBlur']}
      >
        <Input
          prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="请输入邮箱"
          size="large"
          style={styles.input}
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label={<span style={{ fontWeight: 500 }}>密码</span>}
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
          <div className="password-strength-container">
            {/* 密码强度进度条 */}
            <div className="password-strength-bar">
              <Progress
                percent={password ? passwordStrength.score : 0}
                showInfo={false}
                strokeColor={passwordStrength.color}
                trailColor="#f0f0f0"
                size="small"
                style={{ flex: 1, margin: 0 }}
              />
              <Text style={{
                color: passwordStrength.color,
                fontSize: 12,
                fontWeight: 600,
                minWidth: 50,
                textAlign: 'right'
              }}>
                {passwordStrength.text}
              </Text>
            </div>

            {/* 密码要求检查列表 - 始终可见 */}
            <div className="password-strength-requirements">
              <span className={`password-requirement ${passwordRequirements.length ? 'met' : 'unmet'}`}>
                {passwordRequirements.length ? <CheckCircleFilled /> : <CloseCircleFilled />}
                <span>8位以上</span>
              </span>
              <span className={`password-requirement ${passwordRequirements.hasLetter ? 'met' : 'unmet'}`}>
                {passwordRequirements.hasLetter ? <CheckCircleFilled /> : <CloseCircleFilled />}
                <span>含字母</span>
              </span>
              <span className={`password-requirement ${passwordRequirements.hasNumber ? 'met' : 'unmet'}`}>
                {passwordRequirements.hasNumber ? <CheckCircleFilled /> : <CloseCircleFilled />}
                <span>含数字</span>
              </span>
            </div>
          </div>
        }
      >
        <Input.Password
          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="请输入密码"
          size="large"
          style={styles.input}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </Form.Item>

      {/* 密码提示 - 在密码框下方始终显示 */}
      <div className="password-hint-always" style={{ marginTop: -8, marginBottom: 16 }}>
        <InfoCircleOutlined />
        <span>建议使用大小写字母、数字和特殊字符的组合</span>
      </div>

      <Form.Item
        name="confirmPassword"
        label={<span style={{ fontWeight: 500 }}>确认密码</span>}
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
        validateTrigger={['onChange', 'onBlur']}
      >
        <Input.Password
          prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="请再次输入密码"
          size="large"
          style={styles.input}
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 16, marginTop: 24 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          icon={!loading && <UserAddOutlined />}
          block
          size="large"
          style={styles.primaryButton}
          disabled={loading}
        >
          {loading ? '注册中...' : '注册'}
        </Button>
      </Form.Item>

      {onSwitchToLogin && (
        <div className="auth-form-footer">
          <Text type="secondary">
            已有账号？{' '}
            <a onClick={onSwitchToLogin} style={{ fontWeight: 500 }}>立即登录</a>
          </Text>
        </div>
      )}
    </Form>
  );
};

export default RegisterForm;
