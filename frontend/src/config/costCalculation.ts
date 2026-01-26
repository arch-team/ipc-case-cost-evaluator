/**
 * 成本计算相关配置
 */

import type { CostBreakdown, UsageMetrics } from '../types';

// 费用行配置类型
export interface CostRowConfig {
  key: string;
  name: string;
  unit: string;
  getQuantity: (metrics?: UsageMetrics) => number | null;
  formatQuantity: (val: number) => string;
  getAmount: (breakdown?: CostBreakdown) => number;
  unitPrices: Record<string, number>;
}

// AWS 定价配置
export const AWS_PRICING_CONFIG = {
  'S3 Standard': {
    storage: 0.025,
    put: 0.0047,
    get: 0.0004,
    retrieval: 0,
    transfer: 0.114,
    lifecycle: 0,
  },
  'S3 Glacier IR': {
    storage: 0.005,
    put: 0.02,
    get: 0.01,
    retrieval: 0.03,
    transfer: 0.114,
    lifecycle: 0.02,
  },
  'Lifecycle Policy': {
    storage: 0.015,
    put: 0.01,
    get: 0.005,
    retrieval: 0.015,
    transfer: 0.114,
    lifecycle: 0.02,
  },
};

// 费用项配置
export const COST_ROW_CONFIGS: CostRowConfig[] = [
  {
    key: 'storage',
    name: '存储费用',
    unit: '/GB/月',
    getQuantity: (metrics) => metrics?.avg_storage_gb || null,
    formatQuantity: (val) => `${(val / 1024).toFixed(2)} TB`,
    getAmount: (breakdown) => breakdown?.storage_cost || 0,
    unitPrices: {
      'S3 Standard': AWS_PRICING_CONFIG['S3 Standard'].storage,
      'S3 Glacier IR': AWS_PRICING_CONFIG['S3 Glacier IR'].storage,
      'Lifecycle Policy': AWS_PRICING_CONFIG['Lifecycle Policy'].storage,
    },
  },
  {
    key: 'put',
    name: 'PUT 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.put_request_cost || 0,
    unitPrices: {
      'S3 Standard': AWS_PRICING_CONFIG['S3 Standard'].put,
      'S3 Glacier IR': AWS_PRICING_CONFIG['S3 Glacier IR'].put,
      'Lifecycle Policy': AWS_PRICING_CONFIG['Lifecycle Policy'].put,
    },
  },
  {
    key: 'get',
    name: 'GET 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_gets || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.get_request_cost || 0,
    unitPrices: {
      'S3 Standard': AWS_PRICING_CONFIG['S3 Standard'].get,
      'S3 Glacier IR': AWS_PRICING_CONFIG['S3 Glacier IR'].get,
      'Lifecycle Policy': AWS_PRICING_CONFIG['Lifecycle Policy'].get,
    },
  },
  {
    key: 'retrieval',
    name: '数据检索费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_retrieval_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.retrieval_cost || 0,
    unitPrices: {
      'S3 Standard': AWS_PRICING_CONFIG['S3 Standard'].retrieval,
      'S3 Glacier IR': AWS_PRICING_CONFIG['S3 Glacier IR'].retrieval,
      'Lifecycle Policy': AWS_PRICING_CONFIG['Lifecycle Policy'].retrieval,
    },
  },
  {
    key: 'transfer',
    name: '数据传输费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_transfer_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.data_transfer_cost || 0,
    unitPrices: {
      'S3 Standard': AWS_PRICING_CONFIG['S3 Standard'].transfer,
      'S3 Glacier IR': AWS_PRICING_CONFIG['S3 Glacier IR'].transfer,
      'Lifecycle Policy': AWS_PRICING_CONFIG['Lifecycle Policy'].transfer,
    },
  },
  {
    key: 'lifecycle',
    name: '生命周期转换费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: () => '-',
    getAmount: (breakdown) => breakdown?.lifecycle_cost || 0,
    unitPrices: {
      'S3 Standard': AWS_PRICING_CONFIG['S3 Standard'].lifecycle,
      'S3 Glacier IR': AWS_PRICING_CONFIG['S3 Glacier IR'].lifecycle,
      'Lifecycle Policy': AWS_PRICING_CONFIG['Lifecycle Policy'].lifecycle,
    },
  },
];