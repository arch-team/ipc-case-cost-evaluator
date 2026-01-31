/**
 * 存储类型常量 - 统一数据源
 *
 * 所有需要存储类型信息的组件应从此处导入，避免重复定义。
 * 价格数据从后端 API 动态获取，不在此处硬编码。
 */

import type { StorageClass } from '../types';

/**
 * 存储类型元数据
 */
export interface StorageClassMetadata {
  /** 存储类型值 */
  value: StorageClass;
  /** 完整标签（用于正式场合） */
  label: string;
  /** 简短标签（用于紧凑布局） */
  labelShort: string;
  /** 描述提示 */
  hint: string;
  /** Hex 颜色值（用于图表等） */
  color: string;
  /** Ant Design 颜色名（用于 Tag 等组件） */
  antDesignColor: string;
}

/**
 * 所有存储类型的元数据（唯一数据源）
 */
export const STORAGE_CLASS_METADATA: StorageClassMetadata[] = [
  {
    value: 'STANDARD',
    label: 'S3 Standard',
    labelShort: 'Standard',
    hint: '频繁访问，毫秒级延迟',
    color: '#1890ff',
    antDesignColor: 'blue',
  },
  {
    value: 'INTELLIGENT_TIERING',
    label: 'S3 Intelligent-Tiering',
    labelShort: 'Intelligent-Tiering',
    hint: '自动分层，访问模式不确定',
    color: '#2f54eb',
    antDesignColor: 'cyan',
  },
  {
    value: 'STANDARD_IA',
    label: 'S3 Standard-IA',
    labelShort: 'Standard-IA',
    hint: '不频繁访问，毫秒级延迟',
    color: '#52c41a',
    antDesignColor: 'geekblue',
  },
  {
    value: 'ONEZONE_IA',
    label: 'S3 One Zone-IA',
    labelShort: 'One Zone-IA',
    hint: '单可用区，成本更低',
    color: '#a0d911',
    antDesignColor: 'green',
  },
  {
    value: 'GLACIER_IR',
    label: 'S3 Glacier Instant Retrieval',
    labelShort: 'Glacier IR',
    hint: '即时检索归档，毫秒级',
    color: '#13c2c2',
    antDesignColor: 'purple',
  },
  {
    value: 'GLACIER_FR',
    label: 'S3 Glacier Flexible Retrieval',
    labelShort: 'Glacier FR',
    hint: '灵活检索，分钟到小时',
    color: '#fa8c16',
    antDesignColor: 'volcano',
  },
  {
    value: 'DEEP_ARCHIVE',
    label: 'S3 Glacier Deep Archive',
    labelShort: 'Deep Archive',
    hint: '深度归档，12-48小时检索',
    color: '#722ed1',
    antDesignColor: 'orange',
  },
];

/**
 * 存储类型值到元数据的映射
 */
export const STORAGE_CLASS_BY_VALUE: Record<StorageClass, StorageClassMetadata> = Object.fromEntries(
  STORAGE_CLASS_METADATA.map(m => [m.value, m])
) as Record<StorageClass, StorageClassMetadata>;

/**
 * 存储类型标签映射（完整标签）
 * 使用 Record<string, string> 以便支持动态索引
 */
export const STORAGE_CLASS_LABELS: Record<string, string> = Object.fromEntries(
  STORAGE_CLASS_METADATA.map(m => [m.value, m.label])
);

/**
 * 存储类型简短标签映射
 */
export const STORAGE_CLASS_LABELS_SHORT: Record<string, string> = Object.fromEntries(
  STORAGE_CLASS_METADATA.map(m => [m.value, m.labelShort])
);

/**
 * 存储类型颜色映射（Hex）
 */
export const STORAGE_CLASS_COLORS: Record<string, string> = Object.fromEntries(
  STORAGE_CLASS_METADATA.map(m => [m.value, m.color])
);

/**
 * 存储类型颜色映射（Ant Design）
 */
export const STORAGE_CLASS_ANT_COLORS: Record<string, string> = Object.fromEntries(
  STORAGE_CLASS_METADATA.map(m => [m.value, m.antDesignColor])
);

/**
 * Ant Design Select 选项格式（用于表单选择器）
 */
export const STORAGE_CLASS_SELECT_OPTIONS = STORAGE_CLASS_METADATA.map(m => ({
  value: m.value,
  label: m.label,
  hint: m.hint,
  color: m.antDesignColor,
}));

/**
 * 带颜色指示器的选项（用于 StageEditor 等组件）
 */
export const STORAGE_CLASS_OPTIONS_WITH_COLOR = STORAGE_CLASS_METADATA.map(m => ({
  value: m.value,
  label: m.labelShort,
  color: m.color,
}));

/**
 * 获取存储类型标签
 * @param storageClass 存储类型
 * @param format 格式: 'full' 完整标签, 'short' 简短标签
 */
export function getStorageClassLabel(storageClass: string, format: 'full' | 'short' = 'full'): string {
  const metadata = STORAGE_CLASS_BY_VALUE[storageClass as StorageClass];
  if (!metadata) return storageClass;
  return format === 'short' ? metadata.labelShort : metadata.label;
}

/**
 * 获取存储类型颜色
 * @param storageClass 存储类型
 * @param format 格式: 'hex' 十六进制, 'ant' Ant Design 颜色名
 */
export function getStorageClassColor(storageClass: string, format: 'hex' | 'ant' = 'hex'): string {
  const metadata = STORAGE_CLASS_BY_VALUE[storageClass as StorageClass];
  if (!metadata) return format === 'hex' ? '#d9d9d9' : 'default';
  return format === 'ant' ? metadata.antDesignColor : metadata.color;
}

/**
 * 获取存储类型提示
 * @param storageClass 存储类型
 */
export function getStorageClassHint(storageClass: string): string {
  const metadata = STORAGE_CLASS_BY_VALUE[storageClass as StorageClass];
  return metadata?.hint || '';
}

/**
 * 默认存储类型配置
 */
export const STORAGE_CLASS_DEFAULTS = {
  /** 主要存储类型（新方案默认值） */
  primary: 'STANDARD' as StorageClass,
  /** 次要存储类型（生命周期转换默认值） */
  secondary: 'GLACIER_IR' as StorageClass,
} as const;
