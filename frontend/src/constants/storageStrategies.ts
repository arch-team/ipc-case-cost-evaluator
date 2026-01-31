/**
 * 存储策略常量 - 统一数据源
 *
 * 定义所有存储策略的元数据，用于核算记录和详细预览页面。
 */

/**
 * 存储策略类型
 */
export type StorageStrategy =
  | 'single_standard'
  | 'single_glacier_ir'
  | 'lifecycle_std_glacier'
  | 'lifecycle_multi_stage';

/**
 * 存储策略元数据
 */
export interface StorageStrategyMetadata {
  /** 策略值 */
  value: StorageStrategy;
  /** 显示名称 */
  label: string;
  /** 完整描述 */
  labelFull: string;
  /** Ant Design 颜色名 */
  color: string;
}

/**
 * 所有存储策略的元数据（唯一数据源）
 */
export const STORAGE_STRATEGY_METADATA: StorageStrategyMetadata[] = [
  {
    value: 'single_standard',
    label: 'S3 Standard',
    labelFull: 'S3 Standard 单一存储',
    color: 'blue',
  },
  {
    value: 'single_glacier_ir',
    label: 'Glacier IR',
    labelFull: 'Glacier IR 单一存储',
    color: 'cyan',
  },
  {
    value: 'lifecycle_std_glacier',
    label: 'Standard → Glacier',
    labelFull: 'Standard → Glacier 生命周期',
    color: 'purple',
  },
  {
    value: 'lifecycle_multi_stage',
    label: '多阶段生命周期',
    labelFull: '多阶段生命周期策略',
    color: 'magenta',
  },
];

/**
 * 存储策略值到元数据的映射
 */
export const STORAGE_STRATEGY_BY_VALUE: Record<StorageStrategy, StorageStrategyMetadata> =
  Object.fromEntries(
    STORAGE_STRATEGY_METADATA.map(m => [m.value, m])
  ) as Record<StorageStrategy, StorageStrategyMetadata>;

/**
 * 存储策略名称映射（简短名称）
 */
export const STORAGE_STRATEGY_NAMES: Record<string, string> = Object.fromEntries(
  STORAGE_STRATEGY_METADATA.map(m => [m.value, m.label])
);

/**
 * 存储策略完整名称映射
 */
export const STORAGE_STRATEGY_LABELS: Record<string, string> = Object.fromEntries(
  STORAGE_STRATEGY_METADATA.map(m => [m.value, m.labelFull])
);

/**
 * 存储策略颜色映射
 */
export const STORAGE_STRATEGY_COLORS: Record<string, string> = Object.fromEntries(
  STORAGE_STRATEGY_METADATA.map(m => [m.value, m.color])
);

/**
 * 获取存储策略名称
 * @param strategy 存储策略
 * @param format 格式: 'short' 简短, 'full' 完整
 */
export function getStorageStrategyLabel(strategy: string, format: 'short' | 'full' = 'short'): string {
  const metadata = STORAGE_STRATEGY_BY_VALUE[strategy as StorageStrategy];
  if (!metadata) return strategy;
  return format === 'full' ? metadata.labelFull : metadata.label;
}

/**
 * 获取存储策略颜色
 * @param strategy 存储策略
 */
export function getStorageStrategyColor(strategy: string): string {
  return STORAGE_STRATEGY_COLORS[strategy] || 'default';
}
