/**
 * 访问模式选择器组件 V2 - 主组件
 * 负责状态管理和模式切换逻辑
 */
import React, { useMemo, useState } from 'react';
import { Segmented } from 'antd';
import type { AccessPatternConfig, AccessPatternStage } from '../../types';
import { FormLabel } from '../common/FormLabel';
import {
  SimpleModePanel,
  TimeDecayPanel,
  ACCESS_PATTERN_PRESETS,
  DEFAULT_CUSTOM_STAGES,
  calculateWeightedAverage,
  getAdjustedStages,
} from './access-pattern';
import './access-pattern/styles.css';

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

  // 获取当前显示的访问比例
  const displayAccessRate = useMemo(() => {
    if (isTimeDecayMode && accessPatternConfig?.stages) {
      return calculateWeightedAverage(accessPatternConfig.stages, retentionDays);
    }
    return accessPattern;
  }, [isTimeDecayMode, accessPatternConfig, accessPattern, retentionDays]);

  // 处理模式切换
  const handleModeChange = (mode: string | number) => {
    if (mode === 'simple') {
      onChange(displayAccessRate, undefined);
    } else {
      const defaultPreset = ACCESS_PATTERN_PRESETS.find(p => p.recommended) || ACCESS_PATTERN_PRESETS[0];
      handlePresetSelect(defaultPreset.id);
    }
  };

  // 处理简单模式变化
  const handleSimpleChange = (value: number) => {
    onChange(value, undefined);
  };

  // 处理预设选择
  const handlePresetSelect = (presetId: string) => {
    const preset = ACCESS_PATTERN_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const adjustedStages = getAdjustedStages(preset.stages, retentionDays);
    const config: AccessPatternConfig = {
      mode: 'time_decay',
      stages: adjustedStages,
      decay_preset: presetId,
    };

    const weightedAvg = calculateWeightedAverage(preset.stages, retentionDays);
    onChange(weightedAvg, config);
  };

  // 处理自定义模式选择
  const handleCustomSelect = () => {
    const adjustedStages = getAdjustedStages(customStages, retentionDays);
    const config: AccessPatternConfig = {
      mode: 'time_decay',
      stages: adjustedStages,
      decay_preset: 'custom',
    };

    const weightedAvg = calculateWeightedAverage(customStages, retentionDays);
    onChange(weightedAvg, config);
  };

  // 处理自定义阶段变化
  const handleCustomStagesChange = (stages: AccessPatternStage[]) => {
    setCustomStages(stages);

    // 如果当前是自定义模式，实时更新
    if (isCustomMode) {
      const adjustedStages = getAdjustedStages(stages, retentionDays);
      const config: AccessPatternConfig = {
        mode: 'time_decay',
        stages: adjustedStages,
        decay_preset: 'custom',
      };
      const weightedAvg = calculateWeightedAverage(stages, retentionDays);
      onChange(weightedAvg, config);
    }
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
        <SimpleModePanel
          accessPattern={accessPattern}
          onChange={handleSimpleChange}
        />
      )}

      {isTimeDecayMode && (
        <TimeDecayPanel
          selectedPresetId={selectedPresetId}
          retentionDays={retentionDays}
          isCustomMode={isCustomMode}
          customStages={customStages}
          onPresetSelect={handlePresetSelect}
          onCustomSelect={handleCustomSelect}
          onCustomStagesChange={handleCustomStagesChange}
        />
      )}
    </div>
  );
};

export default AccessPatternSelector;