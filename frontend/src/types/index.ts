/**
 * 类型定义
 */

// 录像模式
export type RecordingMode = 'continuous' | 'event_triggered' | 'scheduled';

// 视频质量
export type VideoQuality = '720p' | '1080p' | '2k' | '4k';

// 存储类型
export type StorageClass = 'STANDARD' | 'GLACIER_IR';

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

// 成本计算结果
export interface CostSummary {
  monthly_total: number;
  per_device_monthly: number;
  breakdown: CostBreakdown;
  device_count: number;
  metrics?: UsageMetrics;
  yearly_total: number;
  per_device_yearly: number;
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

// 预设场景
export interface Scenario {
  id: string;
  name: string;
  description: string;
  input: CostCalculationInput;
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
