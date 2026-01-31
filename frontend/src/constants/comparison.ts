/**
 * 方案对比相关的共享常量和工具函数
 */

import type { ComparisonItem } from '../types';
import {
  STORAGE_CLASS_LABELS,
  getStorageClassLabel,
} from './storageClasses';
import {
  COST_ITEM_METADATA,
  SCHEME_COLORS as COST_SCHEME_COLORS,
} from './costItems';

// 存储类型名称映射（从统一数据源导出）
export const STORAGE_CLASS_NAMES: Record<string, string> = STORAGE_CLASS_LABELS;

// 方案颜色（从统一数据源导出）
export const SCHEME_COLORS = COST_SCHEME_COLORS;

// 费用项配置（从统一数据源导出）
export const COST_ITEMS = COST_ITEM_METADATA;

/**
 * 生成技术配置描述
 * @param item 对比项
 * @returns 技术配置描述行数组
 */
export function getTechDescription(item: ComparisonItem): string[] {
  const technical = item.technical;
  if (!technical) {
    return [item.storage_class];
  }

  const lines: string[] = [];

  // 检查是否启用生命周期策略
  if (technical.lifecycle_policy?.enabled) {
    const policy = technical.lifecycle_policy;

    // 如果有阶段配置
    if (policy.stages && policy.stages.length > 0) {
      // 简洁格式：存储类型 + 持续天数
      const stageDescs = policy.stages.map(stage => {
        // 使用简短名称（从统一数据源获取）
        const className = getStorageClassLabel(stage.storage_class, 'short');
        const duration = stage.end_day - stage.start_day + 1;
        return `${className} ${duration}天`;
      });
      lines.push(`生命周期 (${policy.stages.length}阶段)`);
      lines.push(stageDescs.join(' → '));
    } else if (policy.transition_days && policy.target_class) {
      // 简单模式
      const targetName = STORAGE_CLASS_NAMES[policy.target_class] || policy.target_class;
      lines.push(`生命周期策略`);
      lines.push(`${policy.transition_days}天后 → ${targetName}`);
    } else {
      lines.push('生命周期策略');
    }
  } else {
    // 单一存储类型
    const className = STORAGE_CLASS_NAMES[technical.storage_class] || technical.storage_class;
    lines.push(className);
  }

  return lines;
}