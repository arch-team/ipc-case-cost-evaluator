/**
 * 方案对比相关的共享常量和工具函数
 */

import type { ComparisonItem } from '../types';

// 存储类型名称映射
export const STORAGE_CLASS_NAMES: Record<string, string> = {
  'STANDARD': 'S3 Standard',
  'GLACIER_IR': 'S3 Glacier IR',
  'DEEP_ARCHIVE': 'S3 Deep Archive',
};

// 方案颜色（协调的配色方案）
export const SCHEME_COLORS = ['#5B8FF9', '#61DDAA', '#F6BD16', '#7262FD'];

// 费用项配置：键名、中文名、颜色
export const COST_ITEMS = [
  { key: 'storage_cost', name: '存储费用', color: '#5B8FF9' },
  { key: 'put_request_cost', name: 'PUT请求费', color: '#5AD8A6' },
  { key: 'get_request_cost', name: 'GET请求费', color: '#F6BD16' },
  { key: 'retrieval_cost', name: '数据检索费', color: '#E86452' },
  { key: 'data_transfer_cost', name: '数据传输费', color: '#6DC8EC' },
  { key: 'lifecycle_cost', name: '生命周期费', color: '#945FB9' },
];

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
      const stageDescs = policy.stages.map(stage => {
        const className = STORAGE_CLASS_NAMES[stage.storage_class] || stage.storage_class;
        if (stage.start_day === stage.end_day) {
          return `第${stage.start_day}天: ${className}`;
        }
        return `${stage.start_day}-${stage.end_day}天: ${className}`;
      });
      lines.push(`生命周期策略 (${policy.stages.length}阶段)`);
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