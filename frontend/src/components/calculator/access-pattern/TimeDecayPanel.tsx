/**
 * 时间衰减面板 - 预设选项和自定义配置
 */
import React from 'react';
import { Row, Col, Typography, Tooltip } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import type { AccessPatternStage } from '../../../types';
import type { TimeDecayPanelProps } from './types';
import { ACCESS_PATTERN_PRESETS } from './constants';
import { calculateWeightedAverage, getAdjustedStages, formatDays } from './utils';
import CustomValueInput from './CustomValueInput';

const { Text } = Typography;

const TimeDecayPanel: React.FC<TimeDecayPanelProps> = ({
  selectedPresetId,
  retentionDays,
  isCustomMode,
  customStages,
  onPresetSelect,
  onCustomSelect,
  onCustomStagesChange,
}) => {
  // 渲染阶段条形可视化
  const renderStageBar = (stages: AccessPatternStage[]) => {
    const adjusted = getAdjustedStages(stages, retentionDays);
    const maxRate = Math.max(...adjusted.map(s => s.access_rate));
    const totalDays = retentionDays;

    return (
      <div className="access-stage-bar">
        {adjusted.map((stage, index) => {
          const width = ((stage.end_day - stage.start_day + 1) / totalDays) * 100;
          const intensity = stage.access_rate / maxRate;

          return (
            <Tooltip
              key={index}
              title={`${formatDays(stage.start_day, stage.end_day)}: ${(stage.access_rate * 100).toFixed(0)}%`}
            >
              <div
                className="access-stage-segment"
                style={{
                  width: `${Math.max(width, 8)}%`,
                  backgroundColor: `rgba(37, 99, 235, ${0.2 + intensity * 0.6})`,
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  // 渲染阶段标签
  const renderStageLabels = (stages: AccessPatternStage[]) => {
    const adjusted = getAdjustedStages(stages, retentionDays);
    const displayStages = adjusted.slice(0, 3);
    const hasMore = adjusted.length > 3;

    return (
      <div className="access-stage-labels">
        {displayStages.map((stage, idx) => (
          <span key={idx} className="access-stage-label">
            {formatDays(stage.start_day, stage.end_day)}:{(stage.access_rate * 100).toFixed(0)}%
          </span>
        ))}
        {hasMore && <span className="access-stage-label">...</span>}
      </div>
    );
  };

  // 渲染预设卡片
  const renderPresetCard = (preset: typeof ACCESS_PATTERN_PRESETS[0]) => {
    const isSelected = selectedPresetId === preset.id;
    const weightedAvg = calculateWeightedAverage(preset.stages, retentionDays);

    return (
      <div
        key={preset.id}
        className={`access-preset-card ${isSelected ? 'access-preset-card-selected' : ''}`}
        onClick={() => onPresetSelect(preset.id)}
      >
        {isSelected && (
          <div className="access-preset-check">
            <CheckOutlined />
          </div>
        )}

        <div className="access-preset-header">
          <div className="access-preset-name">
            {preset.name}
            {preset.recommended && <span className="access-preset-tag">推荐</span>}
          </div>
          <div className="access-preset-rate">~{(weightedAvg * 100).toFixed(0)}%</div>
        </div>

        {renderStageBar(preset.stages)}
        {renderStageLabels(preset.stages)}
      </div>
    );
  };

  // 获取当前选中预设的描述
  const selectedPresetDescription = (() => {
    if (!selectedPresetId) return null;
    if (selectedPresetId === 'custom') return '自定义时间段访问比例';
    const preset = ACCESS_PATTERN_PRESETS.find(p => p.id === selectedPresetId);
    return preset?.description || null;
  })();

  return (
    <div className="access-presets-container">
      <Row gutter={[8, 8]}>
        {ACCESS_PATTERN_PRESETS.map(preset => (
          <Col xs={12} key={preset.id}>
            {renderPresetCard(preset)}
          </Col>
        ))}
      </Row>

      {/* 自定义配置区域 */}
      <CustomValueInput
        customStages={customStages}
        retentionDays={retentionDays}
        isSelected={isCustomMode}
        onSelect={onCustomSelect}
        onChange={onCustomStagesChange}
      />

      {/* 当前选中的描述 */}
      {selectedPresetDescription && (
        <div className="access-preset-description">
          <Text type="secondary">
            当前: {isCustomMode ? '自定义配置' : ACCESS_PATTERN_PRESETS.find(p => p.id === selectedPresetId)?.name} - {selectedPresetDescription}
          </Text>
        </div>
      )}
    </div>
  );
};

export default TimeDecayPanel;