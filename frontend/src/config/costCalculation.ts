/**
 * 成本计算相关配置
 *
 * 注意：定价数据从后端 API 动态获取，不在前端硬编码
 */

import type { CostBreakdown, UsageMetrics } from '../types';

/**
 * 费用行配置类型
 *
 * 定义费用明细表中每一行的显示和计算逻辑。
 * 注意：单价 (unitPrice) 需要从定价 API 动态获取，不在此处硬编码。
 */
export interface CostRowConfig {
  /** 费用项唯一标识 */
  key: string;
  /** 费用项名称 */
  name: string;
  /** 单位显示文本 */
  unit: string;
  /** 从指标中获取用量 */
  getQuantity: (metrics?: UsageMetrics) => number | null;
  /** 格式化用量显示 */
  formatQuantity: (val: number) => string;
  /** 从费用明细中获取金额 */
  getAmount: (breakdown?: CostBreakdown) => number;
  /** 定价数据字段名（用于从 API 响应中提取单价） */
  pricingField: 'storage_per_gb_month' | 'put_per_1000' | 'get_per_1000' | 'retrieval_per_gb' | 'out_first_10tb_per_gb' | 'lifecycle_transition_per_1000';
}

/**
 * 费用项配置
 *
 * 定义各费用项的显示逻辑，单价从定价 API 动态获取
 */
export const COST_ROW_CONFIGS: CostRowConfig[] = [
  {
    key: 'storage',
    name: '存储费用',
    unit: '/GB/月',
    getQuantity: (metrics) => metrics?.avg_storage_gb || null,
    formatQuantity: (val) => `${(val / 1024).toFixed(2)} TB`,
    getAmount: (breakdown) => breakdown?.storage_cost || 0,
    pricingField: 'storage_per_gb_month',
  },
  {
    key: 'put',
    name: 'PUT 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.put_request_cost || 0,
    pricingField: 'put_per_1000',
  },
  {
    key: 'get',
    name: 'GET 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_gets || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.get_request_cost || 0,
    pricingField: 'get_per_1000',
  },
  {
    key: 'retrieval',
    name: '数据检索费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_retrieval_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.retrieval_cost || 0,
    pricingField: 'retrieval_per_gb',
  },
  {
    key: 'transfer',
    name: '数据传输费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_transfer_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.data_transfer_cost || 0,
    pricingField: 'out_first_10tb_per_gb',
  },
  {
    key: 'lifecycle',
    name: '生命周期转换费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: () => '-',
    getAmount: (breakdown) => breakdown?.lifecycle_cost || 0,
    pricingField: 'lifecycle_transition_per_1000',
  },
];
