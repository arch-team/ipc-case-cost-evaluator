/**
 * 方案对比相关的共享常量和工具函数
 */

import type { ComparisonItem } from '../types';
import {
  STORAGE_CLASS_LABELS,
  getStorageClassLabel,
} from './storageClasses';
import { COST_ITEM_METADATA } from './costItems';
import {
  SCHEME_COLOR_LIST,
  SEMANTIC_COLORS,
  HIGHLIGHT_COLORS as COLOR_HIGHLIGHT,
  CARD_STYLES,
  CONCLUSION_STYLES,
} from './colors';

// 存储类型名称映射（从统一数据源导出）
export const STORAGE_CLASS_NAMES: Record<string, string> = STORAGE_CLASS_LABELS;

// 方案颜色（从统一数据源导出）
export const SCHEME_COLORS = SCHEME_COLOR_LIST;

// 费用项配置（从统一数据源导出）
export const COST_ITEMS = COST_ITEM_METADATA;

/**
 * 对比配置 - 集中管理对比功能使用的颜色和样式
 *
 * 配色设计理念：
 * - 方案色与语义色分离，避免一色多义
 * - 蓝青紫靛色系用于方案标识（纯标识，无语义）
 * - 绿色专用于"节省/正向"语义
 * - 橙色专用于"提醒"语义
 * - 移除黄色洞察区背景，改为中性灰
 */
export const COMPARISON_CONFIG = {
  /** 记录颜色（最多支持 4 条记录对比）- 蓝青紫靛色系 */
  recordColors: SCHEME_COLOR_LIST,

  /** 语义化配色 - 用于差异对比 */
  semanticColors: {
    /** 节省金额（正向结果）- 绿色 */
    saving: SEMANTIC_COLORS.saving,
    /** 额外支出（中性提醒）- 柔和橙 */
    extra: SEMANTIC_COLORS.warning,
    /** 普通数字（无色彩干扰）- 深灰 */
    neutral: SEMANTIC_COLORS.neutral,
    /** 次要文字 - 中灰 */
    secondary: SEMANTIC_COLORS.secondary,
  },

  /** 高亮颜色 - 用于推荐方案和最优值标记 */
  highlightColors: COLOR_HIGHLIGHT,

  /** 卡片样式配置 */
  cardStyles: CARD_STYLES,

  /** 结论区样式配置 */
  conclusionStyles: CONCLUSION_STYLES,
} as const;

/**
 * 图表配色方案 - 用于柱状图、饼图等可视化
 * 蓝青紫靛色系，色相差异明显，便于区分
 */
export const CHART_COLORS = {
  /** 方案1：品牌蓝 */
  scheme1: SCHEME_COLOR_LIST[0],
  /** 方案2：青碧色 */
  scheme2: SCHEME_COLOR_LIST[1],
  /** 方案3：极光紫 */
  scheme3: SCHEME_COLOR_LIST[2],
  /** 方案4：深邃靛 */
  scheme4: SCHEME_COLOR_LIST[3],
} as const;

/**
 * 记录对应的颜色
 * @deprecated 推荐使用 COMPARISON_CONFIG.recordColors
 */
export const RECORD_COLORS = COMPARISON_CONFIG.recordColors;

/**
 * 高亮颜色
 */
export const HIGHLIGHT_COLORS = COMPARISON_CONFIG.highlightColors;

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