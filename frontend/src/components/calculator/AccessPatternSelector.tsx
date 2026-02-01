/**
 * 访问模式选择器组件 V2
 *
 * 支持两种模式（使用 Segmented 明确切换）：
 * 1. 简单模式：单一回看比例滑块（默认）
 * 2. 时间衰减模式：4 个预设卡片 + 自定义配置
 */
import React, { useMemo, useState } from 'react';
import {
  Slider,
  Typography,
  Segmented,
  Row,
  Col,
  Tooltip,
  InputNumber,
  Button,
} from 'antd';
import { CheckOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { AccessPatternConfig, AccessPatternStage } from '../../types';
import { FormLabel } from '../common/FormLabel';
import {
  ACCESS_PATTERN_PRESETS,
  DEFAULT_CUSTOM_STAGES,
} from '../../constants/accessPatterns';

const { Text } = Typography;

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
  const isTimeDecayMode = accessPatternConfig?.mode === 'time_decay';
  const selectedPresetId = accessPatternConfig?.decay_preset;
  const currentMode = isTimeDecayMode ? 'time_decay' : 'simple';
  const isCustomMode = selectedPresetId === 'custom';

  // 自定义阶段的本地状态（用于编辑）
  const [customStages, setCustomStages] = useState<AccessPatternStage[]>(() => {
    if (isCustomMode && accessPatternConfig?.stages) {
      return accessPatternConfig.stages;
    }
    return DEFAULT_CUSTOM_STAGES;
  });

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
      return calculateWeightedAverage(accessPatternConfig.stages);
    }
    return accessPattern;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeDecayMode, accessPatternConfig, accessPattern, retentionDays]);

  // 获取当前选中预设的描述
  const selectedPresetDescription = useMemo(() => {
    if (!isTimeDecayMode || !selectedPresetId) return null;
    if (selectedPresetId === 'custom') return '自定义时间段访问比例';
    const preset = ACCESS_PATTERN_PRESETS.find(p => p.id === selectedPresetId);
    return preset?.description || null;
  }, [isTimeDecayMode, selectedPresetId]);

  // 处理模式切换
  const handleModeChange = (mode: string | number) => {
    if (mode === 'simple') {
      onChange(displayAccessRate, undefined);
    } else {
      const defaultPreset = ACCESS_PATTERN_PRESETS.find(p => p.recommended) || ACCESS_PATTERN_PRESETS[0];
      handlePresetSelect(defaultPreset.id);
    }
  };

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

    const weightedAvg = calculateWeightedAverage(preset.stages);
    onChange(weightedAvg, config);
  };

  // 处理自定义模式选择
  const handleCustomSelect = () => {
    const adjustedStages = getAdjustedStages(customStages);
    const config: AccessPatternConfig = {
      mode: 'time_decay',
      stages: adjustedStages,
      decay_preset: 'custom',
    };

    const weightedAvg = calculateWeightedAverage(customStages);
    onChange(weightedAvg, config);
  };

  // 更新自定义阶段
  const updateCustomStage = (index: number, field: keyof AccessPatternStage, value: number) => {
    const newStages = [...customStages];
    newStages[index] = { ...newStages[index], [field]: value };

    // 自动调整相邻阶段的边界
    if (field === 'end_day' && index < newStages.length - 1) {
      newStages[index + 1] = { ...newStages[index + 1], start_day: value + 1 };
    }
    if (field === 'start_day' && index > 0) {
      newStages[index - 1] = { ...newStages[index - 1], end_day: value - 1 };
    }

    setCustomStages(newStages);

    // 如果当前是自定义模式，实时更新
    if (isCustomMode) {
      const adjustedStages = getAdjustedStages(newStages);
      const config: AccessPatternConfig = {
        mode: 'time_decay',
        stages: adjustedStages,
        decay_preset: 'custom',
      };
      const weightedAvg = calculateWeightedAverage(newStages);
      onChange(weightedAvg, config);
    }
  };

  // 添加新阶段
  const addCustomStage = () => {
    const lastStage = customStages[customStages.length - 1];
    const newStartDay = lastStage ? lastStage.end_day + 1 : 1;
    const newEndDay = Math.min(newStartDay + 30, retentionDays);

    if (newStartDay > retentionDays) return;

    const newStages = [
      ...customStages,
      { start_day: newStartDay, end_day: newEndDay, access_rate: 0.05 },
    ];
    setCustomStages(newStages);

    if (isCustomMode) {
      const adjustedStages = getAdjustedStages(newStages);
      const config: AccessPatternConfig = {
        mode: 'time_decay',
        stages: adjustedStages,
        decay_preset: 'custom',
      };
      const weightedAvg = calculateWeightedAverage(newStages);
      onChange(weightedAvg, config);
    }
  };

  // 删除阶段
  const removeCustomStage = (index: number) => {
    if (customStages.length <= 1) return;

    const newStages = customStages.filter((_, i) => i !== index);
    // 重新调整边界
    for (let i = 1; i < newStages.length; i++) {
      newStages[i] = { ...newStages[i], start_day: newStages[i - 1].end_day + 1 };
    }

    setCustomStages(newStages);

    if (isCustomMode) {
      const adjustedStages = getAdjustedStages(newStages);
      const config: AccessPatternConfig = {
        mode: 'time_decay',
        stages: adjustedStages,
        decay_preset: 'custom',
      };
      const weightedAvg = calculateWeightedAverage(newStages);
      onChange(weightedAvg, config);
    }
  };

  // 格式化天数显示
  const formatDays = (start: number, end: number): string => {
    if (start === end) return `${start}天`;
    return `${start}-${end}天`;
  };

  // 渲染阶段条形可视化
  const renderStageBar = (stages: AccessPatternStage[]) => {
    const adjusted = getAdjustedStages(stages);
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
    const adjusted = getAdjustedStages(stages);
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
    const isSelected = selectedPresetId === preset.id && isTimeDecayMode;
    const weightedAvg = calculateWeightedAverage(preset.stages);

    return (
      <div
        key={preset.id}
        className={`access-preset-card ${isSelected ? 'access-preset-card-selected' : ''}`}
        onClick={() => handlePresetSelect(preset.id)}
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

  // 渲染自定义配置区域
  const renderCustomConfig = () => {
    const weightedAvg = calculateWeightedAverage(customStages);

    return (
      <div className="access-custom-section">
        {/* 自定义卡片头部 */}
        <div
          className={`access-custom-header ${isCustomMode ? 'access-custom-header-selected' : ''}`}
          onClick={handleCustomSelect}
        >
          {isCustomMode && (
            <div className="access-preset-check">
              <CheckOutlined />
            </div>
          )}
          <div className="access-custom-title">
            <EditOutlined style={{ marginRight: 6 }} />
            自定义配置
          </div>
          <div className="access-preset-rate">~{(weightedAvg * 100).toFixed(0)}%</div>
        </div>

        {/* 自定义配置编辑区域 - 仅在选中时展开 */}
        {isCustomMode && (
          <div className="access-custom-editor">
            <div className="access-custom-stages">
              {customStages.map((stage, index) => (
                <div key={index} className="access-custom-stage-row">
                  <div className="access-custom-stage-inputs">
                    <span className="access-custom-stage-label">第</span>
                    <InputNumber
                      size="small"
                      min={index === 0 ? 1 : customStages[index - 1].end_day + 1}
                      max={stage.end_day}
                      value={stage.start_day}
                      onChange={(v) => v && updateCustomStage(index, 'start_day', v)}
                      style={{ width: 60 }}
                      disabled={index === 0}
                    />
                    <span className="access-custom-stage-label">-</span>
                    <InputNumber
                      size="small"
                      min={stage.start_day}
                      max={retentionDays}
                      value={stage.end_day}
                      onChange={(v) => v && updateCustomStage(index, 'end_day', v)}
                      style={{ width: 60 }}
                    />
                    <span className="access-custom-stage-label">天:</span>
                    <InputNumber
                      size="small"
                      min={0}
                      max={100}
                      value={Math.round(stage.access_rate * 100)}
                      onChange={(v) => v !== null && updateCustomStage(index, 'access_rate', v / 100)}
                      formatter={(v) => `${v}%`}
                      parser={(v) => Number(v?.replace('%', '') || 0)}
                      style={{ width: 70 }}
                    />
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeCustomStage(index)}
                    disabled={customStages.length <= 1}
                    className="access-custom-delete-btn"
                  />
                </div>
              ))}
            </div>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={addCustomStage}
              block
              className="access-custom-add-btn"
              disabled={customStages[customStages.length - 1]?.end_day >= retentionDays}
            >
              添加时间段
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="access-pattern-selector-v2">
      <FormLabel
        label={`回看比例 (${(displayAccessRate * 100).toFixed(0)}%)`}
        tooltip="回看比例表示用户回看视频录像的频率。时间衰减模式可以更准确地反映真实使用场景：近期录像回看频繁，历史录像较少访问。"
      />

      <div className="access-mode-switch">
        <Segmented
          value={currentMode}
          onChange={handleModeChange}
          options={[
            { label: '简单模式', value: 'simple' },
            { label: '时间衰减', value: 'time_decay' },
          ]}
          block
        />
      </div>

      {!isTimeDecayMode && (
        <div className="access-simple-slider">
          <Slider
            min={0}
            max={100}
            value={accessPattern * 100}
            onChange={handleSimpleChange}
            marks={{
              0: '0%',
              25: '25%',
              50: '50%',
              75: '75%',
              100: '100%',
            }}
          />
        </div>
      )}

      {isTimeDecayMode && (
        <div className="access-presets-container">
          <Row gutter={[8, 8]}>
            {ACCESS_PATTERN_PRESETS.map(preset => (
              <Col xs={12} key={preset.id}>
                {renderPresetCard(preset)}
              </Col>
            ))}
          </Row>

          {/* 自定义配置区域 */}
          {renderCustomConfig()}

          {/* 当前选中的描述 */}
          {selectedPresetDescription && (
            <div className="access-preset-description">
              <Text type="secondary">
                当前: {isCustomMode ? '自定义配置' : ACCESS_PATTERN_PRESETS.find(p => p.id === selectedPresetId)?.name} - {selectedPresetDescription}
              </Text>
            </div>
          )}
        </div>
      )}

      <style>{`
        .access-pattern-selector-v2 {
          margin-bottom: 8px;
        }

        .access-mode-switch {
          margin: 12px 0;
        }

        .access-mode-switch .ant-segmented {
          background: var(--color-border-light);
        }

        .access-mode-switch .ant-segmented-item-selected {
          background: var(--color-bg-card);
        }

        .access-simple-slider {
          padding: 0 4px;
        }

        .access-presets-container {
          margin-top: 8px;
        }

        /* 预设卡片 */
        .access-preset-card {
          position: relative;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-small);
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--color-bg-card);
          min-height: 100px;
        }

        .access-preset-card:hover {
          border-color: var(--color-primary);
          background: var(--color-primary-light);
        }

        .access-preset-card-selected {
          border-color: var(--color-primary);
          border-width: 2px;
          background: var(--color-primary-light);
        }

        .access-preset-card-selected:hover {
          transform: none;
        }

        .access-preset-check {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          z-index: 1;
        }

        .access-preset-check .anticon {
          color: #fff;
          font-size: 10px;
        }

        .access-preset-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .access-preset-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .access-preset-tag {
          font-size: 10px;
          padding: 1px 5px;
          background: var(--color-success);
          color: #fff;
          border-radius: 8px;
          font-weight: 400;
        }

        .access-preset-rate {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-primary);
        }

        /* 阶段可视化条 */
        .access-stage-bar {
          display: flex;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          gap: 1px;
          margin-bottom: 8px;
        }

        .access-stage-segment {
          min-width: 4px;
          border-radius: 2px;
          transition: opacity 0.2s;
        }

        .access-preset-card:hover .access-stage-segment {
          opacity: 0.9;
        }

        /* 阶段标签 */
        .access-stage-labels {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .access-stage-label {
          font-size: 10px;
          padding: 2px 5px;
          background: var(--color-border-light);
          border-radius: 3px;
          color: var(--color-text-secondary);
        }

        .access-preset-card-selected .access-stage-label {
          background: rgba(37, 99, 235, 0.15);
          color: var(--color-primary);
        }

        /* 当前选中描述 */
        .access-preset-description {
          margin-top: 12px;
          padding: 8px 12px;
          background: var(--color-bg-page);
          border-radius: var(--radius-small);
          text-align: center;
          font-size: 12px;
        }

        /* 自定义配置区域 */
        .access-custom-section {
          margin-top: 12px;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-small);
          overflow: hidden;
        }

        .access-custom-header {
          position: relative;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          background: var(--color-bg-card);
          transition: all 0.2s ease;
        }

        .access-custom-header:hover {
          background: var(--color-primary-light);
        }

        .access-custom-header-selected {
          background: var(--color-primary-light);
          border-color: var(--color-primary);
        }

        .access-custom-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
        }

        .access-custom-editor {
          padding: 12px;
          background: var(--color-bg-page);
          border-top: 1px solid var(--color-border-light);
        }

        .access-custom-stages {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .access-custom-stage-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .access-custom-stage-inputs {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .access-custom-stage-label {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .access-custom-stage-inputs .ant-input-number {
          font-size: 12px;
        }

        .access-custom-delete-btn {
          color: var(--color-text-tertiary);
          flex-shrink: 0;
        }

        .access-custom-delete-btn:hover {
          color: var(--color-error);
        }

        .access-custom-add-btn {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default AccessPatternSelector;
