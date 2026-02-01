/**
 * 访问模式预设常量配置
 *
 * 集中管理访问模式选择器使用的预设和默认值
 */

import type { AccessPatternStage } from '../types';

/**
 * 访问模式预设接口
 */
export interface AccessPatternPreset {
  /** 预设 ID */
  id: string;
  /** 预设名称 */
  name: string;
  /** 预设描述 */
  description: string;
  /** 访问阶段配置 */
  stages: AccessPatternStage[];
  /** 是否推荐 */
  recommended?: boolean;
}

/**
 * 预设访问模式列表
 *
 * 包含 4 个预设：
 * - uniform: 均匀访问
 * - standard_decay: 标准衰减（推荐）
 * - high_frequency: 高频回看
 * - archive_focused: 归档优先
 */
export const ACCESS_PATTERN_PRESETS: AccessPatternPreset[] = [
  {
    id: 'uniform',
    name: '均匀访问',
    description: '所有时间段保持相同访问比例',
    stages: [{ start_day: 1, end_day: 365, access_rate: 0.1 }],
  },
  {
    id: 'standard_decay',
    name: '标准衰减',
    description: '近期高频，逐渐降低',
    stages: [
      { start_day: 1, end_day: 7, access_rate: 0.30 },
      { start_day: 8, end_day: 30, access_rate: 0.08 },
      { start_day: 31, end_day: 90, access_rate: 0.02 },
      { start_day: 91, end_day: 365, access_rate: 0.005 },
    ],
    recommended: true,
  },
  {
    id: 'high_frequency',
    name: '高频回看',
    description: '整体访问频率较高',
    stages: [
      { start_day: 1, end_day: 7, access_rate: 0.50 },
      { start_day: 8, end_day: 30, access_rate: 0.15 },
      { start_day: 31, end_day: 90, access_rate: 0.05 },
      { start_day: 91, end_day: 365, access_rate: 0.01 },
    ],
  },
  {
    id: 'archive_focused',
    name: '归档优先',
    description: '仅近期访问，历史极少回看',
    stages: [
      { start_day: 1, end_day: 3, access_rate: 0.40 },
      { start_day: 4, end_day: 14, access_rate: 0.05 },
      { start_day: 15, end_day: 365, access_rate: 0.001 },
    ],
  },
];

/**
 * 默认自定义阶段配置
 *
 * 当用户选择自定义模式时的初始值
 */
export const DEFAULT_CUSTOM_STAGES: AccessPatternStage[] = [
  { start_day: 1, end_day: 7, access_rate: 0.20 },
  { start_day: 8, end_day: 30, access_rate: 0.10 },
  { start_day: 31, end_day: 90, access_rate: 0.05 },
];
