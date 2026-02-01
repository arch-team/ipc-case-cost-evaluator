/**
 * 核算记录对比工具函数
 */

import { COMPARISON_CONFIG } from '../constants/comparison';

// 记录对应的颜色 - 从常量文件导入
export const RECORD_COLORS = COMPARISON_CONFIG.recordColors;

/**
 * 获取数值对应的高亮颜色
 * 优化策略：仅高亮最优值，不再用红色标记最差值，减少视觉焦虑
 *
 * @param value 当前值
 * @param allValues 所有对比值
 * @param isLowerBetter 是否越低越好（默认 true，成本类指标）
 * @returns 颜色值或 undefined
 */
export const getValueColor = (
  value: number,
  allValues: number[],
  isLowerBetter = true
): string | undefined => {
  const validValues = allValues.filter((v) => v !== undefined && v !== null && !isNaN(v));
  if (validValues.length < 2) return undefined;

  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  if (min === max) return undefined;

  // 仅高亮最优值（使用绿色），不再标记最差值
  if (isLowerBetter) {
    if (value === min) return COMPARISON_CONFIG.semanticColors.saving; // 绿色：最低（最优）
  } else {
    if (value === max) return COMPARISON_CONFIG.semanticColors.saving; // 绿色：最高（最优）
  }
  return undefined;
};

/**
 * 格式化数值显示
 * @param value 数值
 * @param decimals 小数位数
 * @param prefix 前缀（如 $）
 * @param suffix 后缀（如 GB）
 */
export const formatComparisonValue = (
  value: number | undefined | null,
  decimals = 4,
  prefix = '',
  suffix = ''
): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }
  return `${prefix}${value.toFixed(decimals)}${suffix}`;
};

/**
 * 检查参数值是否相同
 * @param values 所有记录的值
 * @returns 是否全部相同
 */
export const areValuesEqual = (values: (string | number | boolean | undefined)[]): boolean => {
  const validValues = values.filter((v) => v !== undefined && v !== null);
  if (validValues.length < 2) return true;
  return validValues.every((v) => v === validValues[0]);
};
