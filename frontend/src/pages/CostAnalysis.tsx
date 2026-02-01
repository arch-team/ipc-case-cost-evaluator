/**
 * 成本分析页面 - 合并原「成本计算」和「详细核算」页面
 *
 * 通过 Tab 切换提供两种分析模式：
 * - 快速对比：实时对比多方案，不保存（原 Calculator 页面）
 * - 详细评估：深度分析+保存记录（原 DetailedCalculation 页面）
 *
 * URL 路由：/cost-analysis?tab=quick|detailed
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, Typography } from 'antd';
import { ThunderboltOutlined, BarChartOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import type { CostCalculationInput } from '../types';
import { STORAGE_CLASS_DEFAULTS } from '../constants/storageClasses';
import { DEFAULT_FORM_VALUES } from '../constants/forms';
import QuickCompareTab from '../components/cost-analysis/QuickCompareTab';
import DetailedEvalTab from '../components/cost-analysis/DetailedEvalTab';

const { Title, Text } = Typography;

// Tab 类型
type TabKey = 'quick' | 'detailed';

// Tab 配置
const TAB_CONFIG = {
  quick: {
    key: 'quick' as const,
    label: '快速对比',
    icon: <ThunderboltOutlined />,
    description: '实时对比多种存储方案，快速了解成本差异',
  },
  detailed: {
    key: 'detailed' as const,
    label: '详细评估',
    icon: <BarChartOutlined />,
    description: '深入分析成本构成，支持保存评估记录',
  },
};

// 默认输入参数
const createDefaultInput = (): CostCalculationInput => ({
  functional: {
    device_count: DEFAULT_FORM_VALUES.deviceCount,
    recording_mode: 'event_triggered',
    video_quality: '1080p',
    events_per_day: DEFAULT_FORM_VALUES.eventsPerDay,
    event_duration_sec: DEFAULT_FORM_VALUES.eventDurationSec,
    retention_days: DEFAULT_FORM_VALUES.retentionDays,
    access_pattern: DEFAULT_FORM_VALUES.accessPattern,
  },
  technical: {
    storage_class: STORAGE_CLASS_DEFAULTS.primary,
  },
  pricing: {
    region: 'ap-northeast-1',
    discount_percent: DEFAULT_FORM_VALUES.discountPercent,
  },
});

const CostAnalysis: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 从 URL 获取当前 Tab，默认为 quick
  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return tab === 'detailed' ? 'detailed' : 'quick';
  }, [searchParams]) as TabKey;

  // 共享的输入参数状态 - 两个 Tab 共享
  const [sharedInput, setSharedInput] = useState<CostCalculationInput>(createDefaultInput);

  // Tab 切换处理
  const handleTabChange = useCallback(
    (key: string) => {
      setSearchParams({ tab: key });
    },
    [setSearchParams]
  );

  // 获取当前 Tab 的描述文案
  const currentTabConfig = TAB_CONFIG[activeTab];

  // Tab 项配置
  const tabItems = [
    {
      key: TAB_CONFIG.quick.key,
      label: (
        <span>
          {TAB_CONFIG.quick.icon}
          <span style={{ marginLeft: 8 }}>{TAB_CONFIG.quick.label}</span>
        </span>
      ),
      children: (
        <QuickCompareTab
          input={sharedInput}
          onInputChange={setSharedInput}
        />
      ),
    },
    {
      key: TAB_CONFIG.detailed.key,
      label: (
        <span>
          {TAB_CONFIG.detailed.icon}
          <span style={{ marginLeft: 8 }}>{TAB_CONFIG.detailed.label}</span>
        </span>
      ),
      children: (
        <DetailedEvalTab
          input={sharedInput}
          onInputChange={setSharedInput}
        />
      ),
    },
  ];

  return (
    <div className="cost-analysis-page">
      {/* 页面标题 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
          成本分析
        </Title>
        <Text type="secondary">{currentTabConfig.description}</Text>
      </div>

      {/* Tab 切换 */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        tabBarStyle={{
          marginBottom: 24,
        }}
        destroyInactiveTabPane={false}
      />
    </div>
  );
};

export default CostAnalysis;
