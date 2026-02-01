/**
 * 费用项常量 - 统一数据源
 *
 * 定义所有成本计算相关的费用项元数据。
 * 与后端 CostBreakdown 模型保持一致。
 *
 * 配色优化：
 * - 统一使用 Ant Design 色系
 * - 移除红色，保持专业中性风格
 * - 色相分布均匀，便于视觉区分
 */

import type { CostBreakdown } from '../types';
import { COST_ITEM_PALETTE } from './colors';

/**
 * 费用项元数据
 */
export interface CostItemMetadata {
  /** 费用项键名（与后端 CostBreakdown 字段对应） */
  key: keyof Omit<CostBreakdown, 'total'>;
  /** 中文名称 */
  name: string;
  /** 图表颜色 */
  color: string;
  /** 描述说明 */
  description?: string;
}

/**
 * 所有费用项的元数据（唯一数据源）
 *
 * 顺序与后端 CostBreakdown 字段顺序一致
 *
 * 配色说明：
 * - 统一使用 Ant Design 色系
 * - 数据检索费从红色改为紫色，避免红绿对立
 */
export const COST_ITEM_METADATA: CostItemMetadata[] = [
  {
    key: 'storage_cost',
    name: '存储费用',
    color: COST_ITEM_PALETTE.storage,
    description: 'S3 存储空间费用',
  },
  {
    key: 'put_request_cost',
    name: 'PUT请求费',
    color: COST_ITEM_PALETTE.put_request,
    description: '上传文件的 PUT 请求费用',
  },
  {
    key: 'get_request_cost',
    name: 'GET请求费',
    color: COST_ITEM_PALETTE.get_request,
    description: '下载文件的 GET 请求费用',
  },
  {
    key: 'retrieval_cost',
    name: '数据检索费',
    color: COST_ITEM_PALETTE.retrieval,
    description: '从 Glacier 等归档存储检索数据的费用',
  },
  {
    key: 'data_transfer_cost',
    name: '数据传输费',
    color: COST_ITEM_PALETTE.data_transfer,
    description: '数据传出 AWS 的网络费用',
  },
  {
    key: 'lifecycle_cost',
    name: '生命周期费',
    color: COST_ITEM_PALETTE.lifecycle,
    description: '生命周期转换操作的费用',
  },
];

/**
 * 费用项键到元数据的映射
 */
export const COST_ITEM_BY_KEY: Record<string, CostItemMetadata> = Object.fromEntries(
  COST_ITEM_METADATA.map(item => [item.key, item])
);

/**
 * 费用项颜色映射
 */
export const COST_ITEM_COLORS: Record<string, string> = Object.fromEntries(
  COST_ITEM_METADATA.map(item => [item.key, item.color])
);

/**
 * 费用项名称映射
 */
export const COST_ITEM_NAMES: Record<string, string> = Object.fromEntries(
  COST_ITEM_METADATA.map(item => [item.key, item.name])
);

/**
 * 获取费用项名称
 * @param key 费用项键名
 */
export function getCostItemName(key: string): string {
  return COST_ITEM_BY_KEY[key]?.name || key;
}

/**
 * 获取费用项颜色
 * @param key 费用项键名
 */
export function getCostItemColor(key: string): string {
  return COST_ITEM_BY_KEY[key]?.color || '#d9d9d9';
}

/**
 * 从 CostBreakdown 对象提取费用项数组（用于图表等）
 * @param breakdown 费用明细对象
 * @returns 费用项数组，包含名称、值和颜色
 */
export function extractCostItems(breakdown: CostBreakdown): Array<{
  key: string;
  name: string;
  value: number;
  color: string;
}> {
  return COST_ITEM_METADATA.map(item => ({
    key: item.key,
    name: item.name,
    value: breakdown[item.key],
    color: item.color,
  })).filter(item => item.value > 0); // 过滤掉零值项
}

/**
 * 方案颜色（用于多方案对比图表）
 * @deprecated 推荐从 colors.ts 导入 SCHEME_COLOR_LIST
 */
export { SCHEME_COLOR_LIST as SCHEME_COLORS } from './colors';
