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
  Descriptions,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import RegionSelector from '../components/admin/RegionSelector';
import PricingTable from '../components/admin/PricingTable';
import type {
  RegionInfo,
  PricingDetailResponse,
  PricingServiceStatus,
  PricingRefreshResponse,
} from '../types';

const { Title, Text, Paragraph } = Typography;

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
        message.success(
          result.is_fallback
            ? `定价数据已更新（使用本地缓存数据）`
            : `定价数据已从 AWS API 更新`
        );
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

  return (
    <div>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>
              <CloudServerOutlined style={{ marginRight: 8 }} />
              定价数据管理
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
              查看和刷新 AWS S3 各区域的定价数据，确保成本计算的准确性
            </Paragraph>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={refreshPricing}
              loading={refreshing}
              size="large"
            >
              刷新定价数据
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 服务状态 */}
      {serviceStatus && (
        <Card style={{ marginBottom: 16 }}>
          <Title level={5}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            服务状态
          </Title>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic
                title="AWS API"
                value={serviceStatus.api_enabled ? '已启用' : '已禁用'}
                valueStyle={{
                  color: serviceStatus.api_enabled ? '#52c41a' : '#faad14',
                }}
                prefix={
                  serviceStatus.api_enabled ? (
                    <CheckCircleOutlined />
                  ) : (
                    <ExclamationCircleOutlined />
                  )
                }
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="API 可用性"
                value={
                  serviceStatus.api_available === null
                    ? '未检测'
                    : serviceStatus.api_available
                    ? '可用'
                    : '不可用'
                }
                valueStyle={{
                  color:
                    serviceStatus.api_available === null
                      ? '#8c8c8c'
                      : serviceStatus.api_available
                      ? '#52c41a'
                      : '#ff4d4f',
                }}
                prefix={
                  serviceStatus.api_available ? (
                    <CheckCircleOutlined />
                  ) : (
                    <ExclamationCircleOutlined />
                  )
                }
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="本地回退"
                value={serviceStatus.fallback_enabled ? '已启用' : '已禁用'}
                valueStyle={{
                  color: serviceStatus.fallback_enabled ? '#52c41a' : '#faad14',
                }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="可用区域"
                value={serviceStatus.available_regions.length}
                suffix="个"
                prefix={<CloudServerOutlined />}
              />
            </Col>
          </Row>
          {!serviceStatus.api_available && serviceStatus.fallback_enabled && (
            <Alert
              message="AWS Pricing API 不可用"
              description="系统将使用本地缓存的定价数据。本地数据可能不是最新的，建议稍后重试刷新。"
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      )}

      {/* 区域选择器 */}
      <Card style={{ marginBottom: 16 }}>
        <RegionSelector
          regions={regions}
          selectedRegion={selectedRegion}
          onRegionChange={handleRegionChange}
          cacheStatus={serviceStatus?.cache}
          loading={loading}
        />
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

      {/* 说明信息 */}
      <Card style={{ marginTop: 16 }}>
        <Title level={5}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          定价数据说明
        </Title>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="数据来源">
            <Space>
              <Tag color="green">AWS_API</Tag>
              <Text>从 AWS Pricing API 实时获取</Text>
              <Tag color="orange">LOCAL_FALLBACK</Tag>
              <Text>使用本地缓存的定价数据</Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="缓存策略">
            定价数据缓存 24 小时，过期后自动重新获取
          </Descriptions.Item>
          <Descriptions.Item label="回退机制">
            当 AWS Pricing API 不可用时，自动使用本地 JSON 文件中的定价数据
          </Descriptions.Item>
          <Descriptions.Item label="更新建议">
            建议定期点击「刷新定价数据」按钮，确保使用最新的 AWS 官方价格
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default AdminPage;
