/**
 * 管理员页面 - 定价数据管理
 *
 * 提供 AWS S3 定价数据的查看和刷新功能
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Alert,
  Spin,
  message,
  Tag,
  Row,
  Col,
  Statistic,
  Tabs,
  Tooltip,
  Progress,
  Collapse,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import RegionSelector from '../components/admin/RegionSelector';
import PricingTable from '../components/admin/PricingTable';
import type {
  RegionInfo,
  PricingDetailResponse,
  PricingServiceStatus,
  PricingRefreshResponse,
} from '../types';

const { Title, Text } = Typography;

// API 基础地址
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const AdminPage: React.FC = () => {
  // 状态
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('ap-northeast-1');
  const [pricing, setPricing] = useState<PricingDetailResponse | null>(null);
  const [serviceStatus, setServiceStatus] = useState<PricingServiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // 加载区域列表
  const loadRegions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/pricing/regions`);
      if (!response.ok) throw new Error('加载区域列表失败');
      const data = await response.json();
      setRegions(data.regions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载区域列表失败');
    }
  }, []);

  // 加载服务状态
  const loadServiceStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/pricing/status`);
      if (!response.ok) throw new Error('加载服务状态失败');
      const data = await response.json();
      setServiceStatus(data);
    } catch (err) {
      console.error('加载服务状态失败:', err);
    }
  }, []);

  // 加载区域定价
  const loadPricing = useCallback(async (region: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/pricing/${region}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`区域 ${region} 暂无定价数据`);
        }
        throw new Error('加载定价数据失败');
      }
      const data = await response.json();
      setPricing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载定价数据失败');
      setPricing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新定价数据
  const refreshPricing = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/pricing/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ region: selectedRegion }),
      });

      if (!response.ok) {
        throw new Error('刷新定价数据失败');
      }

      const result: PricingRefreshResponse = await response.json();

      if (result.success) {
        setLastRefreshTime(new Date());
        message.success({
          content: result.is_fallback
            ? '定价数据已更新（使用本地缓存数据）'
            : '定价数据已从 AWS API 成功更新',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        });
        // 重新加载定价和状态
        await Promise.all([loadPricing(selectedRegion), loadServiceStatus()]);
      } else {
        throw new Error('刷新失败');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '刷新定价数据失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadRegions();
    loadServiceStatus();
  }, [loadRegions, loadServiceStatus]);

  // 区域变化时加载定价
  useEffect(() => {
    if (selectedRegion) {
      loadPricing(selectedRegion);
    }
  }, [selectedRegion, loadPricing]);

  // 处理区域变化
  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };

  // 计算缓存过期进度
  const getCacheProgress = () => {
    const cache = serviceStatus?.cache?.[selectedRegion];
    if (!cache?.cached) return 0;
    const total = cache.age_seconds + cache.expires_in_seconds;
    return Math.round((cache.expires_in_seconds / total) * 100);
  };

  // 格式化剩余时间
  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟`;
    }
    return `${minutes} 分钟`;
  };

  // 服务状态标签页内容
  const ServiceStatusContent = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <Card size="small" bordered={false} style={{ background: '#f6ffed', borderRadius: 8 }}>
          <Statistic
            title={
              <Space>
                <span>AWS API</span>
                <Tooltip title="是否启用 AWS Pricing API 实时获取定价">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            value={serviceStatus?.api_enabled ? '已启用' : '已禁用'}
            valueStyle={{
              color: serviceStatus?.api_enabled ? '#52c41a' : '#faad14',
              fontSize: 18,
            }}
            prefix={
              serviceStatus?.api_enabled ? (
                <CheckCircleOutlined />
              ) : (
                <ExclamationCircleOutlined />
              )
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card size="small" bordered={false} style={{ background: serviceStatus?.api_available ? '#f6ffed' : '#fff2e8', borderRadius: 8 }}>
          <Statistic
            title={
              <Space>
                <span>API 可用性</span>
                <Tooltip title="当前 AWS Pricing API 是否可正常访问">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            value={
              serviceStatus?.api_available === null
                ? '未检测'
                : serviceStatus?.api_available
                ? '可用'
                : '不可用'
            }
            valueStyle={{
              color:
                serviceStatus?.api_available === null
                  ? '#8c8c8c'
                  : serviceStatus?.api_available
                  ? '#52c41a'
                  : '#ff4d4f',
              fontSize: 18,
            }}
            prefix={
              serviceStatus?.api_available ? (
                <CheckCircleOutlined />
              ) : (
                <ExclamationCircleOutlined />
              )
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card size="small" bordered={false} style={{ background: '#f6ffed', borderRadius: 8 }}>
          <Statistic
            title={
              <Space>
                <span>本地回退</span>
                <Tooltip title="API 不可用时自动使用本地缓存数据">
                  <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            value={serviceStatus?.fallback_enabled ? '已启用' : '已禁用'}
            valueStyle={{
              color: serviceStatus?.fallback_enabled ? '#52c41a' : '#faad14',
              fontSize: 18,
            }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card size="small" bordered={false} style={{ background: '#e6f4ff', borderRadius: 8 }}>
          <Statistic
            title="可用区域"
            value={serviceStatus?.available_regions.length || 0}
            suffix="个"
            valueStyle={{ color: '#1677ff', fontSize: 18 }}
            prefix={<CloudServerOutlined />}
          />
        </Card>
      </Col>
      {!serviceStatus?.api_available && serviceStatus?.fallback_enabled && (
        <Col span={24}>
          <Alert
            message="AWS Pricing API 当前不可用"
            description="系统正在使用本地缓存的定价数据。本地数据可能不是最新的，建议稍后点击「刷新定价数据」重试。"
            type="warning"
            showIcon
          />
        </Col>
      )}
    </Row>
  );

  // 帮助信息内容
  const HelpContent = () => (
    <Collapse
      ghost
      items={[
        {
          key: '1',
          label: (
            <Space>
              <InfoCircleOutlined />
              <span>数据来源说明</span>
            </Space>
          ),
          children: (
            <div style={{ paddingLeft: 24 }}>
              <Space direction="vertical" size="small">
                <div>
                  <Tag color="green">AWS_API</Tag>
                  <Text>从 AWS Pricing API 实时获取的最新定价数据</Text>
                </div>
                <div>
                  <Tag color="orange">LOCAL_FALLBACK</Tag>
                  <Text>API 不可用时使用的本地缓存定价数据</Text>
                </div>
              </Space>
            </div>
          ),
        },
        {
          key: '2',
          label: (
            <Space>
              <ClockCircleOutlined />
              <span>缓存策略</span>
            </Space>
          ),
          children: (
            <div style={{ paddingLeft: 24 }}>
              <Text>定价数据缓存 24 小时，过期后首次访问时自动重新获取。手动点击「刷新定价数据」可强制更新。</Text>
            </div>
          ),
        },
        {
          key: '3',
          label: (
            <Space>
              <SyncOutlined />
              <span>回退机制</span>
            </Space>
          ),
          children: (
            <div style={{ paddingLeft: 24 }}>
              <Text>当 AWS Pricing API 不可用时（网络问题、服务故障等），系统自动使用本地 JSON 文件中预置的定价数据，确保服务不中断。</Text>
            </div>
          ),
        },
      ]}
    />
  );

  return (
    <div>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                <DollarOutlined style={{ marginRight: 8 }} />
                定价数据管理
              </Title>
              <Text type="secondary">
                查看和刷新 AWS S3 各区域的定价数据，确保成本计算的准确性
              </Text>
            </Space>
          </Col>
          <Col>
            <Space direction="vertical" size={4} align="end">
              <Button
                type="primary"
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={refreshPricing}
                loading={refreshing}
                size="large"
              >
                刷新定价数据
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

      {/* 服务状态 - 使用 Tabs 组织 */}
      {serviceStatus && (
        <Card style={{ marginBottom: 16 }}>
          <Tabs
            defaultActiveKey="status"
            items={[
              {
                key: 'status',
                label: (
                  <Space>
                    <DatabaseOutlined />
                    服务状态
                  </Space>
                ),
                children: <ServiceStatusContent />,
              },
              {
                key: 'help',
                label: (
                  <Space>
                    <QuestionCircleOutlined />
                    帮助说明
                  </Space>
                ),
                children: <HelpContent />,
              },
            ]}
          />
        </Card>
      )}

      {/* 区域选择器与缓存状态 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} md={12}>
            <RegionSelector
              regions={regions}
              selectedRegion={selectedRegion}
              onRegionChange={handleRegionChange}
              cacheStatus={serviceStatus?.cache}
              loading={loading}
            />
          </Col>
          <Col xs={24} md={12}>
            {serviceStatus?.cache?.[selectedRegion] && (
              <Card size="small" bordered style={{ borderRadius: 8 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>缓存状态</Text>
                    {serviceStatus.cache[selectedRegion].is_fallback ? (
                      <Tag color="warning">本地数据</Tag>
                    ) : (
                      <Tag color="success">AWS API</Tag>
                    )}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      缓存有效期剩余
                    </Text>
                    <Progress
                      percent={getCacheProgress()}
                      size="small"
                      format={() => formatTimeRemaining(serviceStatus.cache[selectedRegion].expires_in_seconds)}
                      strokeColor={getCacheProgress() > 20 ? '#52c41a' : '#faad14'}
                    />
                  </div>
                </Space>
              </Card>
            )}
          </Col>
        </Row>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 定价表格 */}
      <Spin spinning={loading}>
        <PricingTable pricing={pricing} loading={loading} />
      </Spin>
    </div>
  );
};

export default AdminPage;
