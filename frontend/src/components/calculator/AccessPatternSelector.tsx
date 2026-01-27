/**
 * 访问模式选择器组件
 *
 * 支持两种模式：
 * 1. 简单模式：单一回看比例滑块（默认）
 * 2. 时间衰减模式：分阶段配置不同的访问比例
 */
import React, { useState, useMemo } from 'react';
import {
  Slider,
  Radio,
  Card,
  Space,
  Typography,
  Collapse,
  Tooltip,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  SettingOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { AccessPatternConfig, AccessPatternStage } from '../../types';
import { FormLabel } from '../common/FormLabel';

const { Text } = Typography;

// 预设访问模式
const ACCESS_PATTERN_PRESETS = [
  {
    id: 'uniform',
    name: '均匀访问',
    description: '所有时间段保持相同访问比例',
    stages: [{ start_day: 1, end_day: 365, access_rate: 0.1 }],
    color: '#1890ff',
  },
  {
    id: 'standard_decay',
    name: '标准衰减',
    description: '近期高频，逐渐降低，适合一般监控场景',
    stages: [
      { start_day: 1, end_day: 7, access_rate: 0.30 },
      { start_day: 8, end_day: 30, access_rate: 0.08 },
      { start_day: 31, end_day: 90, access_rate: 0.02 },
      { start_day: 91, end_day: 365, access_rate: 0.005 },
    ],
    color: '#52c41a',
    recommended: true,
  },
  {
    id: 'high_frequency',
    name: '高频回看',
    description: '整体访问频率较高，适合安全敏感场景',
    stages: [
      { start_day: 1, end_day: 7, access_rate: 0.50 },
      { start_day: 8, end_day: 30, access_rate: 0.15 },
      { start_day: 31, end_day: 90, access_rate: 0.05 },
      { start_day: 91, end_day: 365, access_rate: 0.01 },
    ],
    color: '#fa8c16',
  },
  {
    id: 'archive_focused',
    name: '归档优先',
    description: '仅近期访问，历史极少回看，适合合规存储',
    stages: [
      { start_day: 1, end_day: 3, access_rate: 0.40 },
      { start_day: 4, end_day: 14, access_rate: 0.05 },
      { start_day: 15, end_day: 365, access_rate: 0.001 },
    ],
    color: '#722ed1',
  },
];

interface AccessPatternSelectorProps {
  accessPattern: number;
  accessPatternConfig?: AccessPatternConfig;
  retentionDays: number;
  onChange: (accessPattern: number, config?: AccessPatternConfig) => void;
}

const AccessPatternSelector: React.FC<AccessPatternSelectorProps> = ({
  accessPattern,
  accessPatternConfig,
  retentionDays,
  onChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(
    accessPatternConfig?.mode === 'time_decay'
  );

  const isTimeDecayMode = accessPatternConfig?.mode === 'time_decay';
  const selectedPresetId = accessPatternConfig?.decay_preset;

  // 根据保留天数调整预设阶段
  const getAdjustedStages = (stages: AccessPatternStage[]): AccessPatternStage[] => {
    return stages
      .filter(stage => stage.start_day <= retentionDays)
      .map(stage => ({
        ...stage,
        end_day: Math.min(stage.end_day, retentionDays),
      }));
  };

  // 计算加权平均访问比例
  const calculateWeightedAverage = (stages: AccessPatternStage[]): number => {
    const adjusted = getAdjustedStages(stages);
    let totalDays = 0;
    let weightedSum = 0;

    for (const stage of adjusted) {
      const days = stage.end_day - stage.start_day + 1;
      weightedSum += stage.access_rate * days;
      totalDays += days;
    }

    return totalDays > 0 ? weightedSum / totalDays : 0;
  };

  // 获取当前显示的访问比例
  const displayAccessRate = useMemo(() => {
    if (isTimeDecayMode && accessPatternConfig?.stages) {
      const adjusted = getAdjustedStages(accessPatternConfig.stages);
      let totalDays = 0;
      let weightedSum = 0;
      for (const stage of adjusted) {
        const days = stage.end_day - stage.start_day + 1;
        weightedSum += stage.access_rate * days;
        totalDays += days;
      }
      return totalDays > 0 ? weightedSum / totalDays : 0;
    }
    return accessPattern;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeDecayMode, accessPatternConfig, accessPattern, retentionDays]);

  // 处理简单模式滑块变化
  const handleSimpleChange = (value: number) => {
    onChange(value / 100, undefined);
  };

  // 处理预设选择
  const handlePresetSelect = (presetId: string) => {
    const preset = ACCESS_PATTERN_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const adjustedStages = getAdjustedStages(preset.stages);
    const config: AccessPatternConfig = {
      mode: 'time_decay',
      stages: adjustedStages,
      decay_preset: presetId,
    };

    // 计算加权平均作为 access_pattern 的备用值
    const weightedAvg = calculateWeightedAverage(preset.stages);
    onChange(weightedAvg, config);
  };

  // 切换到简单模式
  const handleSwitchToSimple = () => {
    onChange(accessPattern, undefined);
  };

  // 渲染访问曲线可视化
  const renderAccessCurve = (stages: AccessPatternStage[]) => {
    const adjusted = getAdjustedStages(stages);
    const maxRate = Math.max(...adjusted.map(s => s.access_rate));

    return (
      <div className="access-curve">
        <div className="access-curve-bars">
          {adjusted.map((stage, index) => {
            const width = ((stage.end_day - stage.start_day + 1) / retentionDays) * 100;
            const height = (stage.access_rate / maxRate) * 100;

            return (
              <Tooltip
                key={index}
                title={`第 ${stage.start_day}-${stage.end_day} 天: ${(stage.access_rate * 100).toFixed(1)}%`}
              >
                <div
                  className="access-curve-bar"
                  style={{
                    width: `${width}%`,
                    height: `${Math.max(height, 10)}%`,
                    backgroundColor: `rgba(24, 144, 255, ${0.3 + (stage.access_rate / maxRate) * 0.7})`,
                  }}
                >
                  <span className="access-curve-label">
                    {(stage.access_rate * 100).toFixed(0)}%
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>
        <div className="access-curve-axis">
          <span>第 1 天</span>
          <span>第 {retentionDays} 天</span>
        </div>
      </div>
    );
  };

  // 渲染预设卡片
  const renderPresetCard = (preset: typeof ACCESS_PATTERN_PRESETS[0]) => {
    const isSelected = selectedPresetId === preset.id && isTimeDecayMode;
    const adjustedStages = getAdjustedStages(preset.stages);
    const weightedAvg = calculateWeightedAverage(preset.stages);

    return (
      <Card
        key={preset.id}
        size="small"
        className={`preset-card ${isSelected ? 'preset-card-selected' : ''}`}
        style={{
          borderColor: isSelected ? preset.color : undefined,
          cursor: 'pointer',
        }}
        onClick={() => handlePresetSelect(preset.id)}
      >
        <div className="preset-card-header">
          <Space>
            <Text strong>{preset.name}</Text>
            {preset.recommended && (
              <Tag color="green" style={{ fontSize: 10 }}>推荐</Tag>
            )}
          </Space>
          {isSelected && <CheckCircleOutlined style={{ color: preset.color }} />}
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {preset.description}
        </Text>
        <div className="preset-stages">
          {adjustedStages.slice(0, 3).map((stage, idx) => (
            <span key={idx} className="preset-stage-tag">
              {stage.start_day}-{stage.end_day}天: {(stage.access_rate * 100).toFixed(0)}%
            </span>
          ))}
          {adjustedStages.length > 3 && <span>...</span>}
        </div>
        <div className="preset-avg">
          加权平均: {(weightedAvg * 100).toFixed(1)}%
        </div>
      </Card>
    );
  };

  return (
    <div className="access-pattern-selector">
      {/* 简单模式滑块 */}
      <div className="access-pattern-simple">
        <FormLabel
          label={`回看比例 (${(displayAccessRate * 100).toFixed(0)}%)`}
          tooltip="回看比例表示用户回看视频录像的频率。时间衰减模式可以更准确地反映真实使用场景：近期录像回看频繁，历史录像较少访问。"
        />
        {!isTimeDecayMode && (
          <Slider
            min={0}
            max={100}
            value={accessPattern * 100}
            onChange={handleSimpleChange}
            marks={{
              0: '0%',
              10: '10%',
              25: '25%',
              50: '50%',
              100: '100%',
            }}
          />
        )}
        {isTimeDecayMode && accessPatternConfig?.stages && (
          <div className="time-decay-preview">
            {renderAccessCurve(accessPatternConfig.stages)}
            <div className="time-decay-info">
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                已启用时间衰减模式，加权平均访问比例: {(displayAccessRate * 100).toFixed(1)}%
              </Text>
            </div>
          </div>
        )}
      </div>

      {/* 高级设置展开 */}
      <Collapse
        ghost
        activeKey={showAdvanced ? ['advanced'] : []}
        onChange={(keys) => setShowAdvanced(keys.includes('advanced'))}
        items={[
          {
            key: 'advanced',
            label: (
              <Space>
                <SettingOutlined />
                <span>高级访问模式设置</span>
              </Space>
            ),
            children: (
              <div className="access-pattern-advanced">
                <Radio.Group
                  value={isTimeDecayMode ? 'time_decay' : 'simple'}
                  onChange={(e) => {
                    if (e.target.value === 'simple') {
                      handleSwitchToSimple();
                    }
                  }}
                  style={{ marginBottom: 16 }}
                >
                  <Radio value="simple">简单模式</Radio>
                  <Radio value="time_decay">时间衰减模式</Radio>
                </Radio.Group>

                {!isTimeDecayMode && (
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    选择预设模式切换到时间衰减模式
                  </Text>
                )}

                <Row gutter={[12, 12]}>
                  {ACCESS_PATTERN_PRESETS.map(preset => (
                    <Col xs={24} sm={12} key={preset.id}>
                      {renderPresetCard(preset)}
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          },
        ]}
      />

      <style>{`
        .access-pattern-selector {
          margin-bottom: 8px;
        }

        .access-pattern-simple {
          margin-bottom: 8px;
        }

        .time-decay-preview {
          padding: 12px;
          background: #fafafa;
          border-radius: 6px;
          margin-top: 8px;
        }

        .time-decay-info {
          margin-top: 8px;
          text-align: center;
        }

        .access-curve {
          padding: 8px 0;
        }

        .access-curve-bars {
          display: flex;
          align-items: flex-end;
          height: 60px;
          gap: 2px;
        }

        .access-curve-bar {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          border-radius: 4px 4px 0 0;
          min-width: 20px;
          transition: all 0.3s;
        }

        .access-curve-bar:hover {
          opacity: 0.8;
        }

        .access-curve-label {
          font-size: 10px;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          padding: 2px;
        }

        .access-curve-axis {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #999;
          margin-top: 4px;
        }

        .preset-card {
          transition: all 0.3s;
        }

        .preset-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .preset-card-selected {
          border-width: 2px;
          background: #f6ffed;
        }

        .preset-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .preset-stages {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .preset-stage-tag {
          font-size: 11px;
          padding: 2px 6px;
          background: #f0f0f0;
          border-radius: 4px;
          color: #666;
        }

        .preset-avg {
          margin-top: 8px;
          font-size: 12px;
          color: #1890ff;
          font-weight: 500;
        }

        .access-pattern-advanced {
          padding: 8px 0;
        }
      `}</style>
    </div>
  );
};

export default AccessPatternSelector;
