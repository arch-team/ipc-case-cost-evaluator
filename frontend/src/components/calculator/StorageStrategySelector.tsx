/**
 * 存储策略选择器
 * 优化版本：更紧凑的布局，适合窄面板
 */
import React, { useEffect, useState } from 'react';
import { Radio, Tag, Typography, Tooltip, Spin, Alert } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import type { LifecycleTemplate, LifecyclePolicy, LifecycleStage } from '../../types';
import StageEditor from './StageEditor';
import { api } from '../../api';

const { Text } = Typography;

interface StorageStrategySelectorProps {
  value: LifecyclePolicy | undefined;
  onChange: (value: LifecyclePolicy | undefined) => void;
  retentionDays: number;
}

type StrategyMode = 'template' | 'custom' | 'single';

const StorageStrategySelector: React.FC<StorageStrategySelectorProps> = ({
  value,
  onChange,
  retentionDays,
}) => {
  const [templates, setTemplates] = useState<LifecycleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<StrategyMode>('single');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // 加载模板
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await api.get('/templates');
        setTemplates(response.data.templates);
        setError(null);
      } catch (err) {
        setError('加载模板失败');
        console.error('Failed to fetch templates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  // 初始化模式（仅在组件挂载时执行一次）
  useEffect(() => {
    if (value?.enabled) {
      if (value.template_id) {
        setMode('template');
        setSelectedTemplateId(value.template_id);
      } else if (value.stages && value.stages.length > 0) {
        setMode('custom');
      }
    } else {
      setMode('single');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理模式切换
  const handleModeChange = (newMode: StrategyMode) => {
    setMode(newMode);
    if (newMode === 'single') {
      onChange(undefined);
      setSelectedTemplateId(null);
    } else if (newMode === 'template') {
      // 如果有已选模板则使用，否则自动选择第一个模板
      const templateToApply = selectedTemplateId
        ? templates.find(t => t.id === selectedTemplateId)
        : templates[0];
      if (templateToApply) {
        applyTemplate(templateToApply);
      }
    } else if (newMode === 'custom') {
      onChange({
        enabled: true,
        stages: [
          { start_day: 1, end_day: retentionDays, storage_class: 'STANDARD' },
        ],
      });
    }
  };

  // 应用模板
  const applyTemplate = (template: LifecycleTemplate) => {
    setSelectedTemplateId(template.id);

    let stages = [...template.stages];
    const templateTotalDays = template.retention_days;

    if (retentionDays !== templateTotalDays) {
      if (retentionDays < templateTotalDays) {
        stages = stages.filter(s => s.start_day <= retentionDays);
        if (stages.length > 0) {
          stages[stages.length - 1] = {
            ...stages[stages.length - 1],
            end_day: retentionDays,
          };
        }
      } else {
        stages[stages.length - 1] = {
          ...stages[stages.length - 1],
          end_day: retentionDays,
        };
      }
    }

    onChange({
      enabled: true,
      stages,
      template_id: template.id,
    });
  };

  // 处理自定义阶段变更
  const handleStagesChange = (stages: LifecycleStage[]) => {
    onChange({
      enabled: true,
      stages,
    });
  };

  // 根据 retentionDays 调整模板阶段（用于 UI 预览）
  const getAdjustedStages = (template: LifecycleTemplate): LifecycleStage[] => {
    let stages = [...template.stages];
    const templateTotalDays = template.retention_days;

    if (retentionDays !== templateTotalDays) {
      if (retentionDays < templateTotalDays) {
        // 截断超出保留天数的阶段
        stages = stages.filter(s => s.start_day <= retentionDays);
        if (stages.length > 0) {
          stages[stages.length - 1] = {
            ...stages[stages.length - 1],
            end_day: retentionDays,
          };
        }
      } else {
        // 延长最后一个阶段
        stages[stages.length - 1] = {
          ...stages[stages.length - 1],
          end_day: retentionDays,
        };
      }
    }
    return stages;
  };

  // 渲染紧凑的阶段预览条
  const renderCompactStageBar = (stages: LifecycleStage[]) => {
    const totalDays = stages[stages.length - 1]?.end_day || 1;
    const colors: Record<string, string> = {
      STANDARD: '#1890ff',
      INTELLIGENT_TIERING: '#2f54eb',
      STANDARD_IA: '#52c41a',
      ONEZONE_IA: '#a0d911',
      GLACIER_IR: '#13c2c2',
      GLACIER_FR: '#fa8c16',
      DEEP_ARCHIVE: '#722ed1',
    };

    return (
      <div className="stage-bar-compact">
        {stages.map((stage, index) => {
          const width = ((stage.end_day - stage.start_day + 1) / totalDays) * 100;
          return (
            <Tooltip
              key={index}
              title={`${stage.start_day}-${stage.end_day}天: ${stage.storage_class.replace('_', ' ')}`}
            >
              <div
                style={{
                  width: `${width}%`,
                  backgroundColor: colors[stage.storage_class] || '#d9d9d9',
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <Spin size="small" />;
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  return (
    <div className="storage-strategy-selector">
      {/* 模式选择 - 紧凑版 */}
      <Radio.Group
        value={mode}
        onChange={(e) => handleModeChange(e.target.value)}
        size="small"
        className="storage-mode-selector"
      >
        <Radio.Button value="single">单一类型</Radio.Button>
        <Radio.Button value="template">预设模板</Radio.Button>
        <Radio.Button value="custom">自定义</Radio.Button>
      </Radio.Group>

      {/* 预设模板列表 - 紧凑版 */}
      {mode === 'template' && (
        <div className="template-list-compact">
          {templates.map((template) => {
            const isSelected = selectedTemplateId === template.id;
            return (
              <div
                key={template.id}
                className={`template-item-compact ${isSelected ? 'selected' : ''}`}
                onClick={() => applyTemplate(template)}
              >
                <div className="template-item-header">
                  <Text strong className="template-name">{template.name}</Text>
                  {isSelected && <CheckCircleOutlined className="check-icon" />}
                </div>
                <div className="template-item-tags">
                  <Tag icon={<ClockCircleOutlined />}>
                    {template.retention_days}天
                  </Tag>
                  <Tooltip title="仅基于存储费用估算，相比全程 S3 Standard。实际节省受回看频率、检索费用、转换费用影响，请以计算结果为准">
                    <Tag color="green" icon={<DollarOutlined />}>
                      省{Math.round(template.estimated_savings_vs_standard * 100)}%
                    </Tag>
                  </Tooltip>
                </div>
                {/* 显示根据 retentionDays 调整后的阶段预览 */}
                {renderCompactStageBar(getAdjustedStages(template))}
                {template.retention_days !== retentionDays && (
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                    已根据保留天数({retentionDays}天)调整
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 自定义配置 */}
      {mode === 'custom' && (
        <div className="custom-config-compact">
          <StageEditor
            value={value?.stages || []}
            onChange={handleStagesChange}
            maxDays={retentionDays}
          />
        </div>
      )}

      {/* 单一存储类型说明 */}
      {mode === 'single' && (
        <Text type="secondary" className="single-mode-hint">
          在技术维度面板中选择存储类型
        </Text>
      )}
    </div>
  );
};

export default StorageStrategySelector;
