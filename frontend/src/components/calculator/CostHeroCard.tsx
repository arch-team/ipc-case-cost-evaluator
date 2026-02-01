/**
 * 费用摘要 Hero 卡片组件
 * 蓝色渐变背景，左侧显示核心指标，右侧显示迷你饼图
 */
import React, { useMemo } from 'react';
import { Tag, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, BranchesOutlined } from '@ant-design/icons';
import { Pie } from '@ant-design/charts';
import type { CostSummary, CostBreakdown, TechnicalDimensions } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { STORAGE_CLASS_LABELS, STORAGE_CLASS_LABELS_SHORT } from '../../constants/storageClasses';

const { Text } = Typography;

interface SchemeInfo {
  id: string;
  name: string;
  technical: TechnicalDimensions;
}

interface CostHeroCardProps {
  result: CostSummary;
  breakdown: CostBreakdown;
  schemeInfo?: SchemeInfo;
  isRecommended?: boolean;
}

interface ChartData {
  name: string;
  value: number;
}

const CostHeroCard: React.FC<CostHeroCardProps> = ({
  result,
  breakdown,
  schemeInfo,
  isRecommended = false,
}) => {
  // 计算单 GB 成本
  const costPerGb = useMemo(() => {
    const avgStorageGb = result.metrics?.avg_storage_gb ?? 0;
    if (avgStorageGb <= 0) return 0;
    return result.monthly_total / avgStorageGb;
  }, [result.monthly_total, result.metrics?.avg_storage_gb]);

  // 检查是否启用生命周期策略
  const lifecyclePolicy = schemeInfo?.technical.lifecycle_policy;
  const isLifecycleEnabled = lifecyclePolicy?.enabled && lifecyclePolicy.stages && lifecyclePolicy.stages.length > 0;

  // 获取存储策略标签（简短）
  const storageLabel = useMemo(() => {
    if (!schemeInfo?.technical) return '';

    if (isLifecycleEnabled && lifecyclePolicy?.stages) {
      const stageCount = lifecyclePolicy.stages.length;
      return `生命周期 (${stageCount}阶段)`;
    }

    return STORAGE_CLASS_LABELS[schemeInfo.technical.storage_class] || schemeInfo.technical.storage_class;
  }, [schemeInfo, isLifecycleEnabled, lifecyclePolicy?.stages]);

  // 获取生命周期阶段详情描述
  const lifecycleDetail = useMemo(() => {
    if (!isLifecycleEnabled || !lifecyclePolicy?.stages) return '';

    const stages = lifecyclePolicy.stages;
    const stageDescriptions = stages.map((stage) => {
      const className = STORAGE_CLASS_LABELS_SHORT[stage.storage_class] || stage.storage_class;
      const days = stage.end_day - stage.start_day;
      return `${className}:${days}天`;
    });

    const totalDays = stages[stages.length - 1]?.end_day || 0;
    return `${stageDescriptions.join(' + ')} = 共${totalDays}天`;
  }, [isLifecycleEnabled, lifecyclePolicy?.stages]);

  // 饼图数据
  const pieData = useMemo<ChartData[]>(() => {
    const items: ChartData[] = [
      { name: '存储', value: breakdown.storage_cost },
      { name: 'PUT', value: breakdown.put_request_cost },
      { name: 'GET', value: breakdown.get_request_cost },
    ];

    if (breakdown.retrieval_cost && breakdown.retrieval_cost > 0) {
      items.push({ name: '检索', value: breakdown.retrieval_cost });
    }
    if (breakdown.data_transfer_cost && breakdown.data_transfer_cost > 0) {
      items.push({ name: '传输', value: breakdown.data_transfer_cost });
    }
    if (breakdown.lifecycle_cost && breakdown.lifecycle_cost > 0) {
      items.push({ name: '生命周期', value: breakdown.lifecycle_cost });
    }

    return items.filter((item) => item.value > 0);
  }, [breakdown]);

  // 迷你饼图配置
  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'name',
    radius: 0.9,
    innerRadius: 0.6,
    height: 140,
    label: false,
    legend: false,
    tooltip: {
      title: 'name',
      items: [
        {
          channel: 'y',
          valueFormatter: (value: number) => `$${value.toFixed(2)}`,
        },
      ],
    },
    interactions: [{ type: 'element-active' }],
    state: {
      inactive: { style: { opacity: 0.5 } },
    },
  };

  return (
    <div className="cost-hero-card">
      <div className="cost-hero-card-content">
        {/* 左侧：核心指标 */}
        <div className="cost-hero-card-left">
          {/* 标签区 */}
          <div className="cost-hero-card-tags">
            {schemeInfo && (
              <>
                {/* 存储策略标签 */}
                {isLifecycleEnabled ? (
                  <Tooltip title={lifecycleDetail}>
                    <Tag
                      className="cost-hero-storage-tag"
                      icon={<BranchesOutlined />}
                      color="purple"
                    >
                      {storageLabel}
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag className="cost-hero-storage-tag">
                    {storageLabel}
                  </Tag>
                )}
              </>
            )}
            {isRecommended && (
              <Tag
                color="green"
                icon={<CheckCircleOutlined />}
                className="cost-hero-recommended-tag"
              >
                推荐方案
              </Tag>
            )}
          </div>
          {/* 生命周期详情（如果启用） */}
          {isLifecycleEnabled && lifecycleDetail && (
            <div className="cost-hero-lifecycle-detail">
              <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)' }}>
                {lifecycleDetail}
              </Text>
            </div>
          )}

          {/* 主指标：月度总成本 */}
          <div className="cost-hero-card-main">
            <div className="cost-hero-card-label">月度总成本</div>
            <div className="cost-hero-card-value">
              <span className="cost-hero-card-currency">$</span>
              {formatNumber(result.monthly_total, 2)}
            </div>
          </div>

          {/* 副指标 */}
          <div className="cost-hero-card-secondary">
            <div className="cost-hero-secondary-item">
              <Text className="cost-hero-secondary-label">单设备成本</Text>
              <Text className="cost-hero-secondary-value">
                ${formatNumber(result.per_device_monthly, 4)}/设备
              </Text>
            </div>
            <div className="cost-hero-secondary-item">
              <Text className="cost-hero-secondary-label">单 GB 成本</Text>
              <Text className="cost-hero-secondary-value">
                ${formatNumber(costPerGb, 4)}/GB
              </Text>
            </div>
          </div>
        </div>

        {/* 右侧：迷你饼图 */}
        <div className="cost-hero-card-right">
          <div className="cost-hero-pie-container">
            {pieData.length > 0 ? (
              <Pie {...pieConfig} />
            ) : (
              <div className="cost-hero-pie-empty">暂无数据</div>
            )}
          </div>
          <div className="cost-hero-pie-title">费用构成</div>
        </div>
      </div>
    </div>
  );
};

export default CostHeroCard;
