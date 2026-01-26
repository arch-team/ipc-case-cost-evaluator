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
    } else if (newMode === 'template' && selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        applyTemplate(template);
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

  // 渲染紧凑的阶段预览条
  const renderCompactStageBar = (stages: LifecycleStage[]) => {
    const totalDays = stages[stages.length - 1]?.end_day || 1;
    const colors: Record<string, string> = {
      STANDARD: '#1890ff',
      GLACIER_IR: '#722ed1',
      DEEP_ARCHIVE: '#fa8c16',
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
                  <Tag color="green" icon={<DollarOutlined />}>
                    省{Math.round(template.estimated_savings_vs_standard * 100)}%
                  </Tag>
                </div>
                {renderCompactStageBar(template.stages)}
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
