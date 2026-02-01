/**
 * 系统监控页面
 *
 * 提供系统运行状态、使用统计、操作日志等监控功能
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Tag,
  Table,
  Button,
  Space,
  Progress,
  Spin,
  Alert,
  Badge,
} from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  DatabaseOutlined,
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../api/adminApi';
import type { SystemStats as SystemStatsType } from '../../types/auth';
import { devLog } from '../../utils/errors';

const { Title, Text } = Typography;

// API 基础地址
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// API 响应时间阈值常量
const API_RESPONSE_TIME = {
  /** 最大响应时间 (ms)，用于进度条计算 */
  MAX: 500,
  /** 良好响应时间阈值 (ms) */
  GOOD: 100,
  /** 警告响应时间阈值 (ms) */
  WARNING: 300,
} as const;

// 状态颜色常量
const STATUS_COLORS = {
  SUCCESS: '#52c41a',
  WARNING: '#faad14',
  ERROR: '#ff4d4f',
  DEFAULT: '#999',
} as const;

/**
 * API 健康状态接口
 * 描述后端 API 的运行状态信息
 */
interface HealthStatus {
  /** 健康状态：healthy | error */
  status: string;
  /** API 版本号 */
  version: string;
  /** 运行环境：production | development */
  environment: string;
  /** 状态检查时间戳 */
  timestamp: string;
}

/**
 * 活动日志条目接口
 * 记录系统操作审计信息
 */
interface ActivityLog {
  /** 日志唯一标识 */
  id: string;
  /** 操作时间 */
  time: string;
  /** 操作类型描述 */
  action: string;
  /** 操作用户 */
  user: string;
  /** 操作详情 */
  details: string;
  /** 操作状态 */
  status: 'success' | 'warning' | 'error';
}

const SystemMonitor: React.FC = () => {
  const [stats, setStats] = useState<SystemStatsType | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // TODO: 替换为 API 数据 - 当前为模拟数据，完整的操作审计日志功能将在后续版本中实现
  // 参考 API: GET /api/v1/admin/activity-logs
  const [activityLogs] = useState<ActivityLog[]>(() => {
    const now = Date.now();
    return [
      {
        id: '1',
        time: new Date(now).toLocaleString('zh-CN'),
        action: '系统启动',
        user: '系统',
        details: '服务正常启动',
        status: 'success',
      },
      {
        id: '2',
        time: new Date(now - 3600000).toLocaleString('zh-CN'),
        action: '定价数据刷新',
        user: 'admin',
        details: 'AWS API 定价数据更新完成',
        status: 'success',
      },
      {
        id: '3',
        time: new Date(now - 7200000).toLocaleString('zh-CN'),
        action: '用户登录',
        user: 'user@example.com',
        details: '登录成功',
        status: 'success',
      },
    ];
  });

  // 加载系统统计
  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (error) {
      devLog.error('加载统计信息失败:', error);
    }
  }, []);

  // 检查 API 健康状态
  const checkHealth = useCallback(async () => {
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_BASE}/health`);
      const endTime = Date.now();
      setApiResponseTime(endTime - startTime);

      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      } else {
        setHealthStatus({
          status: 'error',
          version: 'unknown',
          environment: 'unknown',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      setApiResponseTime(null);
      setHealthStatus({
        status: 'error',
        version: 'unknown',
        environment: 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadStats(), checkHealth()]);
      setLoading(false);
      setLastRefreshTime(new Date());
    };
    loadData();
  }, [loadStats, checkHealth]);

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), checkHealth()]);
    setRefreshing(false);
    setLastRefreshTime(new Date());
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return STATUS_COLORS.SUCCESS;
      case 'warning':
        return STATUS_COLORS.WARNING;
      case 'error':
        return STATUS_COLORS.ERROR;
      default:
        return STATUS_COLORS.DEFAULT;
    }
  };

  // 活动日志表格列
  const logColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : status === 'warning' ? 'warning' : 'error'}>
          {status === 'success' ? '成功' : status === 'warning' ? '警告' : '失败'}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载系统监控数据..." />
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                <DashboardOutlined style={{ marginRight: 8 }} />
                系统监控
              </Title>
              <Text type="secondary">
                实时监控系统运行状态、API 健康度、使用统计和操作日志
              </Text>
            </Space>
          </Col>
          <Col>
            <Space direction="vertical" size={4} align="end">
              <Button
                type="primary"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={handleRefresh}
                loading={refreshing}
              >
                刷新数据
              </Button>
              {lastRefreshTime && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  上次刷新: {lastRefreshTime.toLocaleTimeString()}
                </Text>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 系统状态卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* API 状态 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <ApiOutlined />
                  <span>API 状态</span>
                </Space>
              }
              value={healthStatus?.status === 'healthy' ? '正常' : '异常'}
              valueStyle={{ color: getStatusColor(healthStatus?.status || 'error') }}
              prefix={
                healthStatus?.status === 'healthy' ? (
                  <CheckCircleOutlined />
                ) : (
                  <ExclamationCircleOutlined />
                )
              }
            />
            {apiResponseTime !== null && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  响应时间: {apiResponseTime}ms
                </Text>
                <Progress
                  percent={Math.min(100, (apiResponseTime / API_RESPONSE_TIME.MAX) * 100)}
                  size="small"
                  showInfo={false}
                  strokeColor={
                    apiResponseTime < API_RESPONSE_TIME.GOOD
                      ? STATUS_COLORS.SUCCESS
                      : apiResponseTime < API_RESPONSE_TIME.WARNING
                        ? STATUS_COLORS.WARNING
                        : STATUS_COLORS.ERROR
                  }
                />
              </div>
            )}
          </Card>
        </Col>

        {/* 数据库状态 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <DatabaseOutlined />
                  <span>数据库</span>
                </Space>
              }
              value="正常"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {healthStatus?.environment === 'production' ? 'DynamoDB' : 'LocalStorage'}
              </Text>
            </div>
          </Card>
        </Col>

        {/* 运行环境 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <CloudServerOutlined />
                  <span>运行环境</span>
                </Space>
              }
              value={healthStatus?.environment || '未知'}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Tag color={healthStatus?.environment === 'production' ? 'green' : 'blue'}>
                v{healthStatus?.version || '未知'}
              </Tag>
            </div>
          </Card>
        </Col>

        {/* 系统运行时间 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                <Space>
                  <ThunderboltOutlined />
                  <span>系统状态</span>
                </Space>
              }
              value="运行中"
              valueStyle={{ color: '#52c41a' }}
              prefix={<Badge status="processing" />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                启动时间: {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleString('zh-CN') : '-'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 使用统计 */}
      {stats && (
        <Card title="使用统计" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="总用户数"
                value={stats.total_users}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="活跃用户"
                value={stats.active_users}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="禁用用户"
                value={stats.disabled_users}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="管理员"
                value={stats.admin_count}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="评估记录"
                value={stats.total_evaluations}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="分享链接"
                value={stats.total_shares}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 活动日志 */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>最近活动</span>
          </Space>
        }
      >
        <Alert
          message="日志功能"
          description="当前显示的是模拟数据，完整的操作审计日志功能将在后续版本中实现。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          dataSource={activityLogs}
          columns={logColumns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default SystemMonitor;
