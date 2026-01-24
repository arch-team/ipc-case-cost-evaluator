/**
 * 存储策略选择器
 * 支持预设模板选择和自定义配置
 */
import React, { useEffect, useState } from 'react';
import { Card, Radio, Row, Col, Tag, Typography, Space, Tooltip, Spin, Alert } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import type { LifecycleTemplate, LifecyclePolicy, LifecycleStage } from '../../types';
import StageEditor from './StageEditor';
import { api } from '../../api';

const { Title, Text, Paragraph } = Typography;

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

  // 初始化模式
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
      // 默认自定义配置
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

    // 根据当前保留天数调整模板
    let stages = [...template.stages];
    const templateTotalDays = template.retention_days;

    if (retentionDays !== templateTotalDays) {
      // 简单调整：按比例缩放或截断
      if (retentionDays < templateTotalDays) {
        // 截断超出的阶段
        stages = stages.filter(s => s.start_day <= retentionDays);
        if (stages.length > 0) {
          stages[stages.length - 1] = {
            ...stages[stages.length - 1],
            end_day: retentionDays,
          };
        }
      } else {
        // 扩展最后一个阶段
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

  // 获取存储类型颜色
  const getStorageClassColor = (storageClass: string) => {
    switch (storageClass) {
      case 'STANDARD': return 'blue';
      case 'GLACIER_IR': return 'purple';
      case 'DEEP_ARCHIVE': return 'orange';
      default: return 'default';
    }
  };

  // 渲染阶段预览条
  const renderStageBar = (stages: LifecycleStage[]) => {
    const totalDays = stages[stages.length - 1]?.end_day || 1;

    return (
      <div style={{
        display: 'flex',
        height: 24,
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid #d9d9d9',
      }}>
        {stages.map((stage, index) => {
          const width = ((stage.end_day - stage.start_day + 1) / totalDays) * 100;
          const colors: Record<string, string> = {
            STANDARD: '#1890ff',
            GLACIER_IR: '#722ed1',
            DEEP_ARCHIVE: '#fa8c16',
          };
          return (
            <Tooltip
              key={index}
              title={`第${stage.start_day}-${stage.end_day}天: ${stage.storage_class}`}
            >
              <div
                style={{
                  width: `${width}%`,
                  backgroundColor: colors[stage.storage_class] || '#d9d9d9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 12,
                  minWidth: 30,
                }}
              >
                {stage.storage_class.replace('_', ' ')}
              </div>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return <Spin tip="加载模板中..." />;
  }

  if (error) {
    return <Alert message={error} type="error" />;
  }

  return (
    <div>
      <Title level={5}>存储策略</Title>

      <Radio.Group
        value={mode}
        onChange={(e) => handleModeChange(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="single">单一存储类型</Radio.Button>
        <Radio.Button value="template">预设模板</Radio.Button>
        <Radio.Button value="custom">自定义配置</Radio.Button>
      </Radio.Group>

      {mode === 'template' && (
        <div>
          <Row gutter={[12, 12]}>
            {templates.map((template) => (
              <Col span={12} key={template.id}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => applyTemplate(template)}
                  style={{
                    border: selectedTemplateId === template.id
                      ? '2px solid #1890ff'
                      : undefined,
                    background: selectedTemplateId === template.id
                      ? '#e6f7ff'
                      : undefined,
                  }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{template.name}</Text>
                      {selectedTemplateId === template.id && (
                        <CheckCircleOutlined style={{ color: '#1890ff' }} />
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {template.description}
                    </Text>
                    <Space size={4}>
                      <Tag icon={<ClockCircleOutlined />} color="default">
                        {template.retention_days}天
                      </Tag>
                      <Tag icon={<DollarOutlined />} color="green">
                        节省 {Math.round(template.estimated_savings_vs_standard * 100)}%
                      </Tag>
                    </Space>
                    {renderStageBar(template.stages)}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          {selectedTemplateId && value?.stages && (
            <Card size="small" style={{ marginTop: 16 }}>
              <Text type="secondary">当前配置预览</Text>
              <div style={{ marginTop: 8 }}>
                {value.stages.map((stage, index) => (
                  <div key={index} style={{ marginBottom: 4 }}>
                    <Tag color={getStorageClassColor(stage.storage_class)}>
                      第 {stage.start_day}-{stage.end_day} 天
                    </Tag>
                    <Text>{stage.storage_class}</Text>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {mode === 'custom' && (
        <StageEditor
          value={value?.stages || []}
          onChange={handleStagesChange}
          maxDays={retentionDays}
        />
      )}

      {mode === 'single' && (
        <Paragraph type="secondary">
          使用单一存储类型，所有数据在整个保留期间存储在同一类型中。
          如需混合存储策略以优化成本，请选择"预设模板"或"自定义配置"。
        </Paragraph>
      )}
    </div>
  );
};

export default StorageStrategySelector;
