/**
 * 类型定义
 */

// 录像模式
export type RecordingMode = 'continuous' | 'event_triggered' | 'scheduled';

// 视频质量
export type VideoQuality = '720p' | '1080p' | '2k' | '4k';

// 存储类型
export type StorageClass = 'STANDARD' | 'GLACIER_IR' | 'DEEP_ARCHIVE';

// 生命周期阶段
export interface LifecycleStage {
  start_day: number;
  end_day: number;
  storage_class: StorageClass;
}

// 生命周期策略
export interface LifecyclePolicy {
  enabled: boolean;
  stages?: LifecycleStage[];
  template_id?: string;
  // 简单模式字段（向后兼容）
  transition_days?: number;
  target_class?: StorageClass;
}

// 生命周期模板
export interface LifecycleTemplate {
  id: string;
  name: string;
  description: string;
  retention_days: number;
  stages: LifecycleStage[];
  use_cases: string[];
  estimated_savings_vs_standard: number;
  stage_count: number;
}

// 功能维度
export interface FunctionalDimensions {
  device_count: number;
  recording_mode: RecordingMode;
  video_quality: VideoQuality;
  events_per_day: number;
  event_duration_sec: number;
  retention_days: number;
  access_pattern: number;
}

// 技术维度
export interface TechnicalDimensions {
  storage_class: StorageClass;
  lifecycle_policy?: LifecyclePolicy;
}

// 价格维度
export interface PricingDimensions {
  region: string;
  discount_percent: number;
}

// 成本计算输入
export interface CostCalculationInput {
  functional: FunctionalDimensions;
  technical: TechnicalDimensions;
  pricing: PricingDimensions;
}

// 费用明细
export interface CostBreakdown {
  storage_cost: number;
  put_request_cost: number;
  get_request_cost: number;
  retrieval_cost: number;
  data_transfer_cost: number;
  lifecycle_cost: number;
  total: number;
}

// 使用量指标
export interface UsageMetrics {
  daily_data_gb: number;
  avg_storage_gb: number;
  monthly_puts: number;
  monthly_gets: number;
  monthly_retrieval_gb: number;
  monthly_transfer_gb: number;
}

// 阶梯定价明细
export interface TierDetail {
  tier_name: string;
  range_start_gb: number;
  range_end_gb?: number;
  unit_price: number;
  quantity_gb: number;
  amount: number;
}

// 详细费用项
export interface CostItem {
  name: string;
  unit_price: number;
  unit_price_unit: string;
  quantity: number;
  quantity_unit: string;
  amount: number;
  tiers?: TierDetail[];
}

// 阶段费用明细
export interface StageCostBreakdown {
  stage_name: string;
  storage_class: StorageClass;
  start_day: number;
  end_day: number;
  storage_cost: number;
  put_cost: number;
  get_cost: number;
  retrieval_cost: number;
  transfer_cost: number;
  lifecycle_cost: number;
  total: number;
}

// 定价元数据
export interface PricingMetadata {
  source: string;
  updated_at: string;
  region: string;
  is_fallback: boolean;
}

// 详细费用分解
export interface DetailedCostBreakdown {
  storage_costs?: CostItem[];
  request_costs?: CostItem[];
  data_transfer_tiers?: TierDetail[];
  stage_breakdowns?: StageCostBreakdown[];
}

// 成本计算结果
export interface CostSummary {
  monthly_total: number;
  per_device_monthly: number;
  breakdown: CostBreakdown;
  device_count: number;
  metrics?: UsageMetrics;
  yearly_total: number;
  per_device_yearly: number;
  // 增强版字段（可选）
  pricing_metadata?: PricingMetadata;
  detailed_breakdown?: DetailedCostBreakdown;
}

// 对比项
export interface ComparisonItem {
  name: string;
  storage_class: string;
  monthly_cost: number;
  yearly_cost: number;
  vs_baseline: number;
  breakdown?: CostBreakdown;
  is_recommended: boolean;
}

// 推荐
export interface Recommendation {
  recommended_option: string;
  reason: string;
  potential_savings?: number;
  suggestions?: string[];
}

// 对比结果
export interface ComparisonResult {
  baseline: string;
  items: ComparisonItem[];
  recommendation?: Recommendation;
}

// 评估记录
export interface Evaluation {
  id: string;
  user_id: string;
  name: string;
  description: string;
  input_data: CostCalculationInput;
  result: CostSummary;
  created_at: string;
  updated_at: string;
}

// 预设场景功能维度
export interface ScenarioFunctional {
  device_count: number;
  recording_mode: string;
  video_quality: string;
  events_per_day?: number;
  event_duration_sec?: number;
  retention_days: number;
  access_pattern: number;
  segment_strategy?: string;
  segment_value?: number;
}

// 预设场景技术维度
export interface ScenarioTechnical {
  storage_class: string;
}

// 预设场景价格维度
export interface ScenarioPricing {
  region: string;
  discount_percent: number;
}

// 预设场景
export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  functional: ScenarioFunctional;
  technical: ScenarioTechnical;
  pricing: ScenarioPricing;
}

// API 响应
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// 区域定价
export interface RegionPricing {
  region: string;
  region_name: string;
  storage_classes: {
    [key: string]: {
      storage_per_gb: number;
      put_per_1k: number;
      get_per_1k: number;
      retrieval_per_gb?: number;
      lifecycle_per_1k?: number;
    };
  };
  data_transfer: {
    first_10tb_per_gb: number;
  };
}

// 分享权限
export type SharePermission = 'VIEW' | 'DUPLICATE';

// 分享创建请求
export interface ShareCreate {
  permission?: SharePermission;
  expires_days?: number;
}

// 分享响应
export interface ShareResponse {
  share_token: string;
  share_url: string;
  permission: SharePermission;
  expires_at: string;
  created_at: string;
}

// 分享的评估内容
export interface SharedEvaluation {
  evaluation_id: string;
  name: string;
  description: string;
  input_data: CostCalculationInput;
  result: CostSummary;
  permission: SharePermission;
  created_at: string;
}

// 场景分类
export interface ScenarioCategory {
  id: string;
  name: string;
  description: string;
}
