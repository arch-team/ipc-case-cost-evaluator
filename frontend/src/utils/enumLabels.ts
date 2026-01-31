/**
 * 枚举值中文标签映射
 *
 * 提供各种枚举值的中文友好显示标签，用于在 UI 中展示。
 *
 * 注意：存储类型和区域的标签现在从统一数据源导入，
 * 参见 constants/storageClasses.ts 和 constants/regions.ts
 */

import {
  STORAGE_CLASS_METADATA,
  getStorageClassLabel as _getStorageClassLabel,
  getStorageClassColor as _getStorageClassColor,
} from '../constants/storageClasses';
import { REGION_NAMES_ZH } from '../constants/regions';

/**
 * 录像模式标签
 */
export const recordingModeLabels: Record<string, string> = {
  continuous: '连续录像',
  event_triggered: '事件触发',
  scheduled: '定时录像',
};

/**
 * 视频质量标签
 */
export const videoQualityLabels: Record<string, { label: string; bitrate: string }> = {
  '720p': { label: '720P 高清', bitrate: '1 Mbps' },
  '1080p': { label: '1080P 全高清', bitrate: '2.5 Mbps' },
  '2K': { label: '2K 超清', bitrate: '5 Mbps' },
  '4K': { label: '4K 超高清', bitrate: '12 Mbps' },
};

/**
 * 存储类型标签（从统一数据源导出）
 */
export const storageClassLabels: Record<string, { label: string; color: string }> = Object.fromEntries(
  STORAGE_CLASS_METADATA.map(m => [m.value, { label: m.label, color: m.antDesignColor }])
);

/**
 * 分片策略标签
 */
export const segmentStrategyLabels: Record<string, string> = {
  by_time: '按时长分片',
  by_size: '按大小分片',
  hybrid: '混合分片',
};

/**
 * 存储策略标签（从统一数据源导出）
 */
import {
  STORAGE_STRATEGY_METADATA,
  getStorageStrategyLabel as _getStorageStrategyLabel,
  getStorageStrategyColor as _getStorageStrategyColor,
} from '../constants/storageStrategies';

export const storageStrategyLabels: Record<string, { label: string; color: string }> = Object.fromEntries(
  STORAGE_STRATEGY_METADATA.map(m => [m.value, { label: m.labelFull, color: m.color }])
);

/**
 * AWS 区域标签（从统一数据源导出）
 */
export const regionLabels: Record<string, string> = REGION_NAMES_ZH;

/**
 * 获取录像模式标签
 */
export function getRecordingModeLabel(mode: string): string {
  return recordingModeLabels[mode] || mode;
}

/**
 * 获取视频质量标签
 */
export function getVideoQualityLabel(quality: string): string {
  const info = videoQualityLabels[quality];
  return info ? `${info.label} (${info.bitrate})` : quality;
}

/**
 * 获取存储类型标签（使用统一数据源）
 */
export function getStorageClassLabel(storageClass: string): string {
  return _getStorageClassLabel(storageClass, 'full');
}

/**
 * 获取存储类型颜色（使用统一数据源，返回 Ant Design 颜色名）
 */
export function getStorageClassColor(storageClass: string): string {
  return _getStorageClassColor(storageClass, 'ant');
}

/**
 * 获取分片策略标签
 */
export function getSegmentStrategyLabel(strategy: string): string {
  return segmentStrategyLabels[strategy] || strategy;
}

/**
 * 获取存储策略标签（使用统一数据源）
 */
export function getStorageStrategyLabel(strategy: string): string {
  return _getStorageStrategyLabel(strategy, 'full');
}

/**
 * 获取存储策略颜色（使用统一数据源）
 */
export function getStorageStrategyColor(strategy: string): string {
  return _getStorageStrategyColor(strategy);
}

/**
 * 获取 AWS 区域标签
 */
export function getRegionLabel(region: string): string {
  return regionLabels[region] || region;
}
