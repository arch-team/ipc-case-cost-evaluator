/**
 * 访问模式相关的类型定义
 */
import type { AccessPatternConfig, AccessPatternStage } from '../../../types';

export interface AccessPatternSelectorProps {
  accessPattern: number;
  accessPatternConfig?: AccessPatternConfig;
  retentionDays: number;
  onChange: (accessPattern: number, config?: AccessPatternConfig) => void;
}

export interface SimpleModeProps {
  accessPattern: number;
  onChange: (value: number) => void;
}

export interface TimeDecayPanelProps {
  selectedPresetId?: string;
  retentionDays: number;
  isCustomMode: boolean;
  customStages: AccessPatternStage[];
  onPresetSelect: (presetId: string) => void;
  onCustomSelect: () => void;
  onCustomStagesChange: (stages: AccessPatternStage[]) => void;
}

export interface CustomValueInputProps {
  customStages: AccessPatternStage[];
  retentionDays: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (stages: AccessPatternStage[]) => void;
}