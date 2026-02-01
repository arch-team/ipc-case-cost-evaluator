/**
 * AWS 服务定价公开页面
 *
 * 对所有用户（包括游客）公开的定价信息展示页面
 * 复用管理员页面组件，但不包含管理功能（刷新、导出、服务状态）
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Typography,
  Space,
  Alert,
  Spin,
  Tooltip,
} from 'antd';
import {
  DollarOutlined,
  SwapOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import RegionSelector from '../components/admin/RegionSelector';
import PricingTable from '../components/admin/PricingTable';
import PricingComparison from '../components/admin/PricingComparison';
import type {
  RegionInfo,
  PricingDetailResponse,
} from '../types';

const { Title, Text, Paragraph } = Typography;

// API 基础地址
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const PricingPage: React.FC = () => {
  // 状态
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('ap-northeast-1');
  const [pricing, setPricing] = useState<PricingDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

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

  // 获取指定区域定价（用于对比组件）
  const fetchRegionPricing = useCallback(async (region: string): Promise<PricingDetailResponse> => {
    const response = await fetch(`${API_BASE}/pricing/${region}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`区域 ${region} 暂无定价数据`);
      }
      throw new Error('加载定价数据失败');
    }
    return response.json();
  }, []);

  // 初始化加载
  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

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
      <div className="pricing-page-header">
        <div className="pricing-page-title">
          <DollarOutlined style={{ fontSize: 24, color: 'var(--color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>
            AWS 服务定价
          </Title>
        </div>
      </div>

      {/* 页面说明 */}
      <Alert
        message="定价信息说明"
        description={
          <Space direction="vertical" size={4}>
            <Paragraph style={{ margin: 0, fontSize: 13 }}>
              本页面展示 AWS S3 各存储类型的定价信息，包括存储费用、请求费用和数据传输费用。
              定价数据来源于 AWS 官方 Pricing API，定期更新以确保准确性。
            </Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              实际账单可能因具体使用情况、折扣计划或区域促销活动而有所不同，请以 AWS 控制台显示的价格为准。
            </Text>
          </Space>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 操作栏 */}
      <div className="pricing-action-bar">
        <div className="pricing-action-bar-left">
          <RegionSelector
            regions={regions}
            selectedRegion={selectedRegion}
            onRegionChange={handleRegionChange}
            loading={loading}
          />
        </div>
        <div className="pricing-action-bar-right">
          <Tooltip title="对比不同区域的定价">
            <Button
              icon={<SwapOutlined />}
              onClick={() => setShowComparison(!showComparison)}
              type={showComparison ? 'primary' : 'default'}
            >
              区域对比
            </Button>
          </Tooltip>
        </div>
      </div>

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
        <PricingTable
          pricing={pricing}
          loading={loading}
          comparisonSlot={
            showComparison ? (
              <PricingComparison
                regions={regions}
                onLoadPricing={fetchRegionPricing}
              />
            ) : null
          }
        />
      </Spin>
    </div>
  );
};

export default PricingPage;
