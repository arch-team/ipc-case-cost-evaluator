/**
 * 多方案管理面板
 * 支持最多 4 个技术方案的配置和对比
 */
import React, { useState } from 'react';
import {
  Tabs,
  Input,
  Switch,
  Space,
  Typography,
  Tooltip,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { TechnicalScheme, TechnicalDimensions, MultiTechnicalConfig } from '../../types';
import TechnicalForm from './TechnicalForm';

const { Text } = Typography;

interface MultiSchemePanelProps {
  value: MultiTechnicalConfig;
  onChange: (value: MultiTechnicalConfig) => void;
  retentionDays: number;
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
}) => {
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

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

  // 开始编辑名称
  const handleStartEditName = (scheme: TechnicalScheme) => {
    setEditingNameId(scheme.id);
    setTempName(scheme.name);
  };

  // 保存名称
  const handleSaveName = () => {
    if (!editingNameId || !tempName.trim()) {
      setEditingNameId(null);
      return;
    }

    const newSchemes = schemes.map((s) =>
      s.id === editingNameId ? { ...s, name: tempName.trim() } : s
    );
    onChange({
      ...value,
      schemes: newSchemes,
    });
    setEditingNameId(null);
  };

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
          {/* 方案名称和启用开关 */}
          <div className="scheme-header">
            <div className="scheme-name-edit">
              {editingNameId === activeScheme.id ? (
                <Input
                  size="small"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleSaveName}
                  onPressEnter={handleSaveName}
                  autoFocus
                  style={{ width: 150 }}
                />
              ) : (
                <Space>
                  <Text
                    strong
                    className="scheme-name"
                    onClick={() => handleStartEditName(activeScheme)}
                    style={{ cursor: 'pointer' }}
                  >
                    {activeScheme.name}
                  </Text>
                  {schemes.findIndex((s) => s.id === activeScheme.id) === 0 && (
                    <Tag icon={<StarOutlined />} color="blue">
                      基准
                    </Tag>
                  )}
                </Space>
              )}
            </div>
            <div className="scheme-toggle">
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  参与对比
                </Text>
                <Switch
                  size="small"
                  checked={activeScheme.enabled}
                  onChange={(checked) =>
                    handleToggleEnabled(activeScheme.id, checked)
                  }
                />
              </Space>
            </div>
          </div>

          {/* 技术配置表单 */}
          <div className="scheme-form">
            <TechnicalForm
              value={activeScheme.technical}
              onChange={handleTechnicalChange}
              retentionDays={retentionDays}
            />
          </div>
        </div>
      )}

      {/* 方案概览 */}
      <div className="schemes-overview">
        <Text type="secondary" style={{ fontSize: 12 }}>
          已配置 {schemes.length} 个方案，
          {schemes.filter((s) => s.enabled).length} 个参与对比
        </Text>
      </div>
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
