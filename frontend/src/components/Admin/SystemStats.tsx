/**
 * 系统统计组件
 */
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, message } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  ShareAltOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../api/adminApi';
import type { SystemStats as SystemStatsType } from '../../types/auth';

const SystemStats: React.FC = () => {
  const [stats, setStats] = useState<SystemStatsType | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '获取统计信息失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" tip="加载统计信息..." />
      </div>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic
            title="总用户数"
            value={stats.total_users}
            prefix={<TeamOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic
            title="活跃用户"
            value={stats.active_users}
            prefix={<UserOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic
            title="禁用用户"
            value={stats.disabled_users}
            prefix={<StopOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic
            title="管理员"
            value={stats.admin_count}
            prefix={<SafetyCertificateOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic
            title="评估记录"
            value={stats.total_evaluations}
            prefix={<FileTextOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={8} lg={4}>
        <Card>
          <Statistic
            title="分享链接"
            value={stats.total_shares}
            prefix={<ShareAltOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default SystemStats;
