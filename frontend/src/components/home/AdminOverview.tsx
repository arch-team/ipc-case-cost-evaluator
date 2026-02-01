/**
 * 管理员系统概览组件
 * 显示系统统计信息和管理员快捷操作
 */
import { Card, Row, Col, Statistic, Button, Typography, Space, Skeleton } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  DollarOutlined,
  DashboardOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { SystemStats } from '../../types/auth';

const { Title } = Typography;

interface AdminOverviewProps {
  systemStats: SystemStats;
  adminDataLoading: boolean;
}

export function AdminOverview({ systemStats, adminDataLoading }: AdminOverviewProps) {
  const navigate = useNavigate();

  return (
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
  );
}