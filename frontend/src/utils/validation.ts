/**
 * 表单验证工具函数
 *
 * 提供统一的输入验证逻辑，减少表单组件中的重复代码
 */

/** 字段约束配置 */
export interface FieldConstraint {
  min: number;
  max: number;
  default: number;
}

/** 字段约束定义 */
export const FIELD_CONSTRAINTS: Record<string, FieldConstraint> = {
  device_count: { min: 1, max: 100000, default: 100 },
  retention_days: { min: 1, max: 365, default: 30 },
  events_per_day: { min: 1, max: 10000, default: 400 },
  event_duration_sec: { min: 1, max: 300, default: 15 },
  scheduled_hours: { min: 1, max: 24, default: 8 },
  segment_value: { min: 1, max: 3600, default: 60 },
};

/**
 * 验证并规范化数值
 *
 * @param field - 字段名称
 * @param value - 输入值
 * @returns 规范化后的值
 */
export function validateNumericField(
  field: string,
  value: string | number | null | undefined
): number {
  const constraints = FIELD_CONSTRAINTS[field];

  if (!constraints) {
    // 如果没有约束定义，返回原值或0
    return typeof value === 'number' ? value : 0;
  }

  // 处理空值
  if (value === null || value === undefined || value === '') {
    return constraints.default;
  }

  // 转换为数字
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // 检查是否为有效数字
  if (isNaN(numValue)) {
    return constraints.default;
  }

  // 确保值在有效范围内
  return Math.max(constraints.min, Math.min(constraints.max, numValue));
}

/**
 * 批量验证数值字段
 *
 * @param fields - 字段值映射
 * @returns 验证后的字段值映射
 */
export function validateNumericFields(
  fields: Record<string, string | number | null | undefined>
): Record<string, number> {
  const validated: Record<string, number> = {};

  for (const [field, value] of Object.entries(fields)) {
    validated[field] = validateNumericField(field, value);
  }

  return validated;
}

/**
 * 格式化数字显示
 *
 * @param value - 数值
 * @param decimals - 小数位数
 * @returns 格式化的字符串
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 验证百分比值
 *
 * @param value - 输入值
 * @param min - 最小值（默认0）
 * @param max - 最大值（默认1）
 * @returns 规范化的百分比值
 */
export function validatePercentage(
  value: number | null | undefined,
  min = 0,
  max = 1
): number {
  if (value === null || value === undefined) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * 验证正整数
 *
 * @param value - 输入值
 * @param defaultValue - 默认值
 * @returns 有效的正整数
 */
export function validatePositiveInteger(
  value: number | null | undefined,
  defaultValue: number
): number {
  if (value === null || value === undefined || value <= 0) {
    return defaultValue;
  }
  return Math.floor(value);
}