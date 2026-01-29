/**
 * 多方案管理面板
 * 支持最多 4 个技术方案的配置和对比
 */
import React from 'react';
import {
  Tabs,
  Switch,
  Space,
  Typography,
  Tooltip,
  Tag,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { TechnicalScheme, TechnicalDimensions, MultiTechnicalConfig } from '../../types';
import TechnicalForm from './TechnicalForm';

const { Text } = Typography;

interface MultiSchemePanelProps {
  value: MultiTechnicalConfig;
  onChange: (value: MultiTechnicalConfig) => void;
  retentionDays: number;
  region: string;
}

const MAX_SCHEMES = 4;

// 默认方案名称
const DEFAULT_SCHEME_NAMES = ['方案 A', '方案 B', '方案 C', '方案 D'];

// 生成唯一 ID
const generateId = () => `scheme_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// 创建默认方案
const createDefaultScheme = (index: number): TechnicalScheme => ({
  id: generateId(),
  name: DEFAULT_SCHEME_NAMES[index] || `方案 ${index + 1}`,
  technical: {
    storage_class: index === 0 ? 'STANDARD' : 'GLACIER_IR',
  },
  enabled: true,
});

const MultiSchemePanel: React.FC<MultiSchemePanelProps> = ({
  value,
  onChange,
  retentionDays,
  region,
}) => {
  // 保留供未来名称编辑功能使用
  // const [editingNameId, setEditingNameId] = useState<string | null>(null);
  // const [tempName, setTempName] = useState('');

  const { schemes, activeSchemeId } = value;
  const activeScheme = schemes.find((s) => s.id === activeSchemeId);

  // 添加新方案
  const handleAddScheme = () => {
    if (schemes.length >= MAX_SCHEMES) return;

    const newScheme = createDefaultScheme(schemes.length);
    onChange({
      schemes: [...schemes, newScheme],
      activeSchemeId: newScheme.id,
    });
  };

  // 删除方案
  const handleDeleteScheme = (schemeId: string) => {
    if (schemes.length <= 1) return;

    const newSchemes = schemes.filter((s) => s.id !== schemeId);
    const newActiveId =
      activeSchemeId === schemeId ? newSchemes[0].id : activeSchemeId;

    onChange({
      schemes: newSchemes,
      activeSchemeId: newActiveId,
    });
  };

  // 切换方案
  const handleTabChange = (key: string) => {
    onChange({
      ...value,
      activeSchemeId: key,
    });
  };

  // 更新方案技术配置
  const handleTechnicalChange = (technical: TechnicalDimensions) => {
    const newSchemes = schemes.map((s) =>
      s.id === activeSchemeId ? { ...s, technical } : s
    );
    onChange({
      ...value,
      schemes: newSchemes,
    });
  };

  // 更新方案级保留天数
  const handleSchemeRetentionDaysChange = (days: number | null) => {
    const newSchemes = schemes.map((s) => {
      if (s.id !== activeSchemeId) return s;

      // 如果设置的值与全局默认值相同，则清除自定义值
      const customDays = days === retentionDays ? undefined : days ?? undefined;
      return { ...s, retention_days: customDays };
    });
    onChange({
      ...value,
      schemes: newSchemes,
    });
  };

  // 获取当前方案的实际保留天数
  const getSchemeRetentionDays = (scheme: TechnicalScheme) => {
    return scheme.retention_days ?? retentionDays;
  };

  // 切换方案启用状态
  const handleToggleEnabled = (schemeId: string, enabled: boolean) => {
    const newSchemes = schemes.map((s) =>
      s.id === schemeId ? { ...s, enabled } : s
    );
    onChange({
      ...value,
      schemes: newSchemes,
    });
  };

  // 名称编辑功能（保留供未来使用）
  // const handleStartEditName = (scheme: TechnicalScheme) => {
  //   setEditingNameId(scheme.id);
  //   setTempName(scheme.name);
  // };

  // const handleSaveName = () => {
  //   if (!editingNameId || !tempName.trim()) {
  //     setEditingNameId(null);
  //     return;
  //   }

  //   const newSchemes = schemes.map((s) =>
  //     s.id === editingNameId ? { ...s, name: tempName.trim() } : s
  //   );
  //   onChange({
  //     ...value,
  //     schemes: newSchemes,
  //   });
  //   setEditingNameId(null);
  // };

  // 获取方案标签
  const getSchemeLabel = (scheme: TechnicalScheme, index: number) => {
    const isBaseline = index === 0;

    return (
      <div className="scheme-tab-label">
        <Space size={4}>
          {scheme.enabled ? (
            <CheckCircleOutlined
              style={{ color: 'var(--color-success)', fontSize: 12 }}
            />
          ) : (
            <span style={{ width: 12, display: 'inline-block' }} />
          )}
          <span>{scheme.name}</span>
          {isBaseline && (
            <Tag
              color="blue"
              style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px', margin: 0 }}
            >
              基准
            </Tag>
          )}
        </Space>
      </div>
    );
  };

  // 构建 Tab 项
  const tabItems = schemes.map((scheme, index) => ({
    key: scheme.id,
    label: getSchemeLabel(scheme, index),
    closable: schemes.length > 1,
  }));

  return (
    <div className="multi-scheme-panel">
      {/* 方案 Tab 切换 */}
      <div className="scheme-tabs-container">
        <Tabs
          type="editable-card"
          activeKey={activeSchemeId}
          onChange={handleTabChange}
          onEdit={(targetKey, action) => {
            if (action === 'add') {
              handleAddScheme();
            } else if (action === 'remove' && typeof targetKey === 'string') {
              handleDeleteScheme(targetKey);
            }
          }}
          items={tabItems}
          addIcon={
            schemes.length < MAX_SCHEMES ? (
              <Tooltip title="添加方案">
                <PlusOutlined />
              </Tooltip>
            ) : (
              <Tooltip title="最多支持 4 个方案">
                <PlusOutlined style={{ color: 'var(--color-text-tertiary)' }} />
              </Tooltip>
            )
          }
          hideAdd={schemes.length >= MAX_SCHEMES}
          size="small"
          className="scheme-tabs"
        />
      </div>

      {/* 当前方案配置 */}
      {activeScheme && (
        <div className="scheme-config">
          {/* 保留天数 + 参与对比 - 简化的单行布局 */}
          <div className="scheme-header" style={{ gap: 12, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--color-border-light)' }}>
            {/* 方案级保留天数 */}
            <Tooltip title={activeScheme.retention_days === undefined ? `使用默认值 ${retentionDays} 天` : '自定义保留天数'}>
              <Space size={4}>
                <Text style={{ fontSize: 13 }}>保留天数</Text>
                <ClockCircleOutlined style={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                <InputNumber
                  size="small"
                  min={1}
                  max={365}
                  value={getSchemeRetentionDays(activeScheme)}
                  onChange={handleSchemeRetentionDaysChange}
                  style={{ width: 60 }}
                  controls={false}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>天</Text>
                {activeScheme.retention_days === undefined && (
                  <Tag color="default" style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px', margin: 0 }}>
                    默认
                  </Tag>
                )}
              </Space>
            </Tooltip>
            {/* 参与对比开关 */}
            <div style={{ marginLeft: 'auto' }}>
              <Space size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>参与对比</Text>
                <Switch
                  size="small"
                  checked={activeScheme.enabled}
                  onChange={(checked) => handleToggleEnabled(activeScheme.id, checked)}
                />
              </Space>
            </div>
          </div>

          {/* 技术配置表单 */}
          <div className="scheme-form">
            <TechnicalForm
              value={activeScheme.technical}
              onChange={handleTechnicalChange}
              retentionDays={getSchemeRetentionDays(activeScheme)}
              region={region}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSchemePanel;

// 创建初始配置的辅助函数
// eslint-disable-next-line react-refresh/only-export-components
export const createInitialMultiConfig = (): MultiTechnicalConfig => {
  const scheme = createDefaultScheme(0);
  return {
    schemes: [scheme],
    activeSchemeId: scheme.id,
  };
};

// 从单一技术配置创建多方案配置
// eslint-disable-next-line react-refresh/only-export-components
export const createMultiConfigFromSingle = (
  technical: TechnicalDimensions
): MultiTechnicalConfig => {
  const scheme: TechnicalScheme = {
    id: generateId(),
    name: '方案 A',
    technical,
    enabled: true,
  };
  return {
    schemes: [scheme],
    activeSchemeId: scheme.id,
  };
};
