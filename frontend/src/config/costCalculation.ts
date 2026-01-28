/**
 * 成本计算相关配置
 *
 * 注意：定价数据从后端 API 动态获取，不在前端硬编码
 */

import type { CostBreakdown, UsageMetrics, TechnicalDimensions, RegionPricing, StorageClass } from '../types';

/**
 * 费用公式生成参数
 */
export interface CostFormulaParams {
  /** 定价数据 */
  pricing?: RegionPricing;
  /** 技术配置（包含生命周期策略） */
  technical?: TechnicalDimensions;
  /** 使用量指标 */
  metrics?: UsageMetrics;
}

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
  /** 用量计算公式说明 */
  formula?: string;
  /** 从指标中获取用量 */
  getQuantity: (metrics?: UsageMetrics) => number | null;
  /** 格式化用量显示 */
  formatQuantity: (val: number) => string;
  /** 从费用明细中获取金额 */
  getAmount: (breakdown?: CostBreakdown) => number;
  /** 定价数据字段名（用于从 API 响应中提取单价） */
  pricingField: 'storage_per_gb_month' | 'put_per_1000' | 'get_per_1000' | 'retrieval_per_gb' | 'out_first_10tb_per_gb' | 'lifecycle_transition_per_1000';
  /** 生成费用计算公式（用于显示费用金额的计算过程） */
  getCostFormula?: (params: CostFormulaParams) => string | null;
}

/**
 * 生成存储费用的计算公式
 *
 * 对于生命周期策略：阶段1天数×单价1 + 阶段2天数×单价2
 * 对于单一存储类型：存储量×单价
 */
function generateStorageCostFormula(params: CostFormulaParams): string | null {
  const { pricing, technical } = params;
  if (!pricing || !technical) return null;

  const lifecycle = technical.lifecycle_policy;

  // 检查是否启用了生命周期策略
  if (lifecycle?.enabled && lifecycle.stages && lifecycle.stages.length > 1) {
    // 多阶段生命周期策略
    const formulaParts: string[] = [];
    for (const stage of lifecycle.stages) {
      const days = stage.end_day - stage.start_day + 1;
      const price = pricing.storage_classes[stage.storage_class as StorageClass]?.storage_per_gb_month || 0;
      formulaParts.push(`${days}天×$${price}`);
    }
    return formulaParts.join(' + ');
  }

  // 单一存储类型
  const storageClass = technical.storage_class as StorageClass;
  const price = pricing.storage_classes[storageClass]?.storage_per_gb_month || 0;
  if (price > 0) {
    return `存储量×$${price}/GB`;
  }

  return null;
}

/**
 * 生成 PUT 请求费用的计算公式
 */
function generatePutCostFormula(params: CostFormulaParams): string | null {
  const { pricing, technical, metrics } = params;
  if (!pricing || !technical) return null;

  // PUT 请求费用只在第一阶段收取
  const storageClass = technical.storage_class as StorageClass;
  const price = pricing.storage_classes[storageClass]?.put_per_1000 || 0;
  if (price > 0 && metrics?.monthly_puts) {
    const thousands = (metrics.monthly_puts / 1000).toFixed(0);
    return `${thousands}千次×$${price}`;
  }

  return null;
}

/**
 * 生成 GET 请求费用的计算公式
 */
function generateGetCostFormula(params: CostFormulaParams): string | null {
  const { pricing, technical } = params;
  if (!pricing || !technical) return null;

  const lifecycle = technical.lifecycle_policy;

  // 对于生命周期策略，显示各阶段的 GET 单价
  if (lifecycle?.enabled && lifecycle.stages && lifecycle.stages.length > 1) {
    const formulaParts: string[] = [];
    for (const stage of lifecycle.stages) {
      const days = stage.end_day - stage.start_day + 1;
      const price = pricing.storage_classes[stage.storage_class as StorageClass]?.get_per_1000 || 0;
      if (price > 0) {
        formulaParts.push(`${days}天×$${price}`);
      }
    }
    return formulaParts.length > 0 ? formulaParts.join(' + ') : null;
  }

  const storageClass = technical.storage_class as StorageClass;
  const price = pricing.storage_classes[storageClass]?.get_per_1000 || 0;
  if (price > 0) {
    return `请求数×$${price}/千次`;
  }

  return null;
}

/**
 * 生成数据检索费用的计算公式
 */
function generateRetrievalCostFormula(params: CostFormulaParams): string | null {
  const { pricing, technical } = params;
  if (!pricing || !technical) return null;

  const lifecycle = technical.lifecycle_policy;

  if (lifecycle?.enabled && lifecycle.stages && lifecycle.stages.length > 1) {
    // 显示有检索费用的阶段的单价
    const formulaParts: string[] = [];
    for (const stage of lifecycle.stages) {
      const price = pricing.storage_classes[stage.storage_class as StorageClass]?.retrieval_per_gb || 0;
      if (price > 0) {
        const days = stage.end_day - stage.start_day + 1;
        formulaParts.push(`${days}天×$${price}`);
      }
    }
    return formulaParts.length > 0 ? formulaParts.join(' + ') : null;
  }

  const storageClass = technical.storage_class as StorageClass;
  const price = pricing.storage_classes[storageClass]?.retrieval_per_gb || 0;
  if (price > 0) {
    return `检索量×$${price}/GB`;
  }

  return null;
}

/**
 * 生成数据传输费用的计算公式
 */
function generateTransferCostFormula(params: CostFormulaParams): string | null {
  const { pricing } = params;
  if (!pricing) return null;

  const price = pricing.data_transfer.out_first_10tb_per_gb;
  if (price > 0) {
    return `传输量×$${price}/GB`;
  }

  return null;
}

/**
 * 生成生命周期转换费用的计算公式
 */
function generateLifecycleCostFormula(params: CostFormulaParams): string | null {
  const { pricing, technical } = params;
  if (!pricing || !technical) return null;

  const lifecycle = technical.lifecycle_policy;

  if (!lifecycle?.enabled || !lifecycle.stages || lifecycle.stages.length <= 1) {
    return null;
  }

  // 计算转换费用（从第二阶段开始）
  const formulaParts: string[] = [];
  for (let i = 1; i < lifecycle.stages.length; i++) {
    const stage = lifecycle.stages[i];
    const price = pricing.storage_classes[stage.storage_class as StorageClass]?.lifecycle_transition_per_1000 || 0;
    if (price > 0) {
      formulaParts.push(`转换×$${price}/千次`);
    }
  }

  return formulaParts.length > 0 ? formulaParts.join(' + ') : null;
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
    formula: '设备数 × 日数据量 × 保留天数',
    getQuantity: (metrics) => metrics?.avg_storage_gb || null,
    formatQuantity: (val) => `${(val / 1024).toFixed(2)} TB`,
    getAmount: (breakdown) => breakdown?.storage_cost || 0,
    pricingField: 'storage_per_gb_month',
    getCostFormula: generateStorageCostFormula,
  },
  {
    key: 'put',
    name: 'PUT 请求费',
    unit: '/千次',
    formula: '设备数 × 日分片数 × 30',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.put_request_cost || 0,
    pricingField: 'put_per_1000',
    getCostFormula: generatePutCostFormula,
  },
  {
    key: 'get',
    name: 'GET 请求费',
    unit: '/千次',
    formula: 'PUT请求数 × 回看比例',
    getQuantity: (metrics) => metrics?.monthly_gets || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.get_request_cost || 0,
    pricingField: 'get_per_1000',
    getCostFormula: generateGetCostFormula,
  },
  {
    key: 'retrieval',
    name: '数据检索费',
    unit: '/GB',
    formula: '存储量 × 回看比例',
    getQuantity: (metrics) => metrics?.monthly_retrieval_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.retrieval_cost || 0,
    pricingField: 'retrieval_per_gb',
    getCostFormula: generateRetrievalCostFormula,
  },
  {
    key: 'transfer',
    name: '数据传输费',
    unit: '/GB',
    formula: '存储量 × 回看比例',
    getQuantity: (metrics) => metrics?.monthly_transfer_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.data_transfer_cost || 0,
    pricingField: 'out_first_10tb_per_gb',
    getCostFormula: generateTransferCostFormula,
  },
  {
    key: 'lifecycle',
    name: '生命周期转换费',
    unit: '/千次',
    formula: '转换对象数',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: () => '-',
    getAmount: (breakdown) => breakdown?.lifecycle_cost || 0,
    pricingField: 'lifecycle_transition_per_1000',
    getCostFormula: generateLifecycleCostFormula,
  },
];
