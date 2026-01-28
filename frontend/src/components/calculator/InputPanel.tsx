/**
 * 左侧参数输入面板
 * 双栏布局中的输入区域，使用折叠面板组织三类维度
 */
import React, { useState, useEffect } from 'react';
import {
  Collapse,
  Select,
  Button,
  Space,
  Tag,
  Tooltip,
  message,
  InputNumber,
  Typography,
} from 'antd';
import {
  SettingOutlined,
  CloudOutlined,
  DollarOutlined,
  RocketOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  SaveOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
import type {
  CostCalculationInput,
  FunctionalDimensions,
  TechnicalDimensions,
  PricingDimensions,
  Scenario,
  ScenarioCategory,
  MultiTechnicalConfig,
  RecordingMode,
  VideoQuality,
  StorageClass,
} from '../../types';
import { scenarioApi } from '../../api/client';
import FunctionalForm from './FunctionalForm';
import TechnicalForm from './TechnicalForm';
import PricingForm from './PricingForm';
import MultiSchemePanel from './MultiSchemePanel';
import { REGION_NAMES_ZH_SHORT } from '../../constants/regions';

interface InputPanelProps {
  value: CostCalculationInput;
  onChange: (value: CostCalculationInput) => void;
  multiConfig?: MultiTechnicalConfig;
  onMultiConfigChange?: (config: MultiTechnicalConfig) => void;
  useMultiScheme?: boolean;
  onExport?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  isLoggedIn?: boolean;
}

// 存储类型显示名称
const storageClassLabels: Record<string, string> = {
  STANDARD: 'Standard',
  GLACIER_IR: 'Glacier IR',
  DEEP_ARCHIVE: 'Deep Archive',
};

// 区域显示名称 - 使用统一数据源
const regionLabels = REGION_NAMES_ZH_SHORT;

const InputPanel: React.FC<InputPanelProps> = ({
  value,
  onChange,
  multiConfig,
  onMultiConfigChange,
  useMultiScheme = false,
  onExport,
  onShare,
  onSave,
  isLoggedIn = false,
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [categories, setCategories] = useState<ScenarioCategory[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isCustomized, setIsCustomized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeKeys, setActiveKeys] = useState<string[]>(['quick-start']);

  // 加载预设场景
  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await scenarioApi.list();
      setScenarios(data.scenarios || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('加载预设场景失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理场景选择
  const handleScenarioSelect = (scenarioId: string) => {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;

    const input: CostCalculationInput = {
      functional: {
        device_count: scenario.functional.device_count,
        recording_mode: scenario.functional.recording_mode as RecordingMode,
        video_quality: scenario.functional.video_quality as VideoQuality,
        events_per_day: scenario.functional.events_per_day || 400,
        event_duration_sec: scenario.functional.event_duration_sec || 15,
        retention_days: scenario.functional.retention_days,
        access_pattern: scenario.functional.access_pattern,
      },
      technical: {
        storage_class: scenario.technical.storage_class as StorageClass,
      },
      pricing: {
        region: scenario.pricing.region,
        discount_percent: scenario.pricing.discount_percent,
      },
    };

    setSelectedScenarioId(scenarioId);
    setIsCustomized(false);
    onChange(input);
    message.success(`已加载场景: ${scenario.name}`);
  };

  // 处理功能维度变化
  const handleFunctionalChange = (functional: FunctionalDimensions) => {
    setIsCustomized(true);
    onChange({ ...value, functional });
  };

  // 处理技术维度变化
  const handleTechnicalChange = (technical: TechnicalDimensions) => {
    setIsCustomized(true);
    onChange({ ...value, technical });
  };

  // 处理价格维度变化
  const handlePricingChange = (pricing: PricingDimensions) => {
    setIsCustomized(true);
    onChange({ ...value, pricing });
  };

  // 处理保留天数变化（从技术维度面板调用）
  const handleRetentionDaysChange = (days: number) => {
    setIsCustomized(true);
    onChange({
      ...value,
      functional: {
        ...value.functional,
        retention_days: days,
      },
    });
  };

  // 处理多方案配置变化
  const handleMultiConfigChange = (config: MultiTechnicalConfig) => {
    if (onMultiConfigChange) {
      onMultiConfigChange(config);
    }
    setIsCustomized(true);
  };

  // 获取功能维度摘要
  const getFunctionalSummary = () => {
    return `${value.functional.device_count} 台`;
  };

  // 获取技术维度摘要
  const getTechnicalSummary = () => {
    if (useMultiScheme && multiConfig) {
      const totalCount = multiConfig.schemes.length;
      const enabledCount = multiConfig.schemes.filter((s) => s.enabled).length;
      return `${totalCount}个方案/${enabledCount}个参与对比`;
    } else if (value.technical.lifecycle_policy?.enabled) {
      return `${value.functional.retention_days} 天 · 生命周期`;
    } else {
      return `${value.functional.retention_days} 天 · ${storageClassLabels[value.technical.storage_class] || value.technical.storage_class}`;
    }
  };

  // 获取价格维度摘要
  const getPricingSummary = () => {
    const region = regionLabels[value.pricing.region] || value.pricing.region;
    if (value.pricing.discount_percent > 0) {
      return `${region} · ${value.pricing.discount_percent}% 折扣`;
    }
    return region;
  };

  // 构建场景选择器选项
  const scenarioOptions = categories.map((cat) => ({
    label: cat.name,
    options: scenarios
      .filter((s) => s.category === cat.id)
      .map((s) => ({
        value: s.id,
        label: s.name,
      })),
  }));

  // 折叠面板项
  const collapseItems = [
    {
      key: 'quick-start',
      label: (
        <div className="input-panel-header">
          <span className="input-panel-header-title">
            <RocketOutlined style={{ marginRight: 8 }} />
            快速开始
          </span>
          {selectedScenarioId && (
            <Tag
              color={isCustomized ? 'orange' : 'green'}
              style={{ marginLeft: 'auto', marginRight: 8 }}
            >
              {isCustomized ? '已自定义' : '已预设'}
            </Tag>
          )}
        </div>
      ),
      children: (
        <div className="input-panel-quick-start-content">
          <Select
            placeholder="选择预设场景..."
            style={{ width: '100%' }}
            loading={loading}
            value={selectedScenarioId}
            onChange={handleScenarioSelect}
            options={scenarioOptions}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>
      ),
    },
    {
      key: 'functional',
      label: (
        <div className="input-panel-header">
          <span className="input-panel-header-title">
            <SettingOutlined style={{ marginRight: 8 }} />
            功能维度
          </span>
          <span className="input-panel-header-summary">{getFunctionalSummary()}</span>
          <Tooltip title="设备数量、录像模式、视频质量等基本配置">
            <QuestionCircleOutlined className="input-panel-header-help" />
          </Tooltip>
        </div>
      ),
      children: (
        <FunctionalForm value={value.functional} onChange={handleFunctionalChange} />
      ),
    },
    {
      key: 'technical',
      label: (
        <div className="input-panel-header">
          <span className="input-panel-header-title">
            <CloudOutlined style={{ marginRight: 8 }} />
            技术维度
          </span>
          <span className="input-panel-header-summary">{getTechnicalSummary()}</span>
          <Tooltip title="存储类型和生命周期策略配置">
            <QuestionCircleOutlined className="input-panel-header-help" />
          </Tooltip>
        </div>
      ),
      children: (
        <>
          {/* 默认保留天数 - 放在技术维度顶部 */}
          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockCircleOutlined style={{ fontSize: 14, color: 'var(--color-primary)' }} />
              <Text style={{ fontSize: 13 }}>默认保留天数</Text>
              <InputNumber
                size="small"
                min={1}
                max={365}
                value={value.functional.retention_days}
                onChange={(days) => days && handleRetentionDaysChange(days)}
                style={{ width: 70 }}
                controls={false}
              />
              <Text type="secondary" style={{ fontSize: 13 }}>天</Text>
              <Tooltip title="所有方案的默认数据保留期限，各方案可单独覆盖此值">
                <QuestionCircleOutlined style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'help' }} />
              </Tooltip>
            </div>
          </div>
          {useMultiScheme && multiConfig ? (
            <MultiSchemePanel
              value={multiConfig}
              onChange={handleMultiConfigChange}
              retentionDays={value.functional.retention_days}
              region={value.pricing.region}
            />
          ) : (
            <TechnicalForm
              value={value.technical}
              onChange={handleTechnicalChange}
              retentionDays={value.functional.retention_days}
              region={value.pricing.region}
            />
          )}
        </>
      ),
    },
    {
      key: 'pricing',
      label: (
        <div className="input-panel-header">
          <span className="input-panel-header-title">
            <DollarOutlined style={{ marginRight: 8 }} />
            价格维度
          </span>
          <span className="input-panel-header-summary">{getPricingSummary()}</span>
          <Tooltip title="AWS 区域和企业折扣设置">
            <QuestionCircleOutlined className="input-panel-header-help" />
          </Tooltip>
        </div>
      ),
      children: <PricingForm value={value.pricing} onChange={handlePricingChange} />,
    },
  ];

  return (
    <div className="input-panel">
      {/* 所有配置折叠面板 */}
      <Collapse
        className="input-panel-collapse"
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        items={collapseItems}
        expandIconPosition="start"
      />

      {/* 底部操作按钮 */}
      <div className="input-panel-actions">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space.Compact block>
            {onExport && (
              <Button icon={<DownloadOutlined />} onClick={onExport} style={{ flex: 1 }}>
                导出 Excel
              </Button>
            )}
            {onShare && (
              <Button icon={<ShareAltOutlined />} onClick={onShare} style={{ flex: 1 }}>
                分享链接
              </Button>
            )}
          </Space.Compact>
          {onSave && (
            <Tooltip title={isLoggedIn ? '保存评估记录' : '请先登录'}>
              <Button
                icon={<SaveOutlined />}
                onClick={onSave}
                disabled={!isLoggedIn}
                block
              >
                保存评估
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </div>
  );
};

export default InputPanel;
