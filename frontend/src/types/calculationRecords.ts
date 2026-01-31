/**
 * 详细成本核算记录类型定义
 */

// ============================================================
// 存储策略类型
// ============================================================

export type StorageStrategy =
  | 'single_standard'
  | 'single_glacier_ir'
  | 'lifecycle_std_glacier'
  | 'lifecycle_multi_stage';

// ============================================================
// 输入参数快照
// ============================================================

export interface FunctionalDimensionSnapshot {
  device_count: number;
  recording_mode: string;
  video_quality: string;
  retention_days: number;
  events_per_day?: number;
  event_duration_seconds?: number;
  scheduled_hours?: number;
  access_pattern: number;
}

export interface TechnicalDimensionSnapshot {
  storage_class: string;
  segment_strategy: string;
  segment_seconds?: number;
  segment_size_kb?: number;
  lifecycle_enabled: boolean;
  lifecycle_stages?: Array<{
    start_day: number;
    end_day: number;
    storage_class: string;
  }>;
}

export interface PricingDimensionSnapshot {
  region: string;
  region_name: string;
  discount_percent: number;
}

export interface InputParameterSnapshot {
  functional: FunctionalDimensionSnapshot;
  technical: TechnicalDimensionSnapshot;
  pricing: PricingDimensionSnapshot;
}

// ============================================================
// 中间计算指标
// ============================================================

// 访问模式阶段快照
export interface AccessPatternStageSnapshot {
  start_day: number;
  end_day: number;
  access_rate: number;
  duration_days: number;
}

export interface IntermediateMetricsDetail {
  daily_recording_seconds: number;
  daily_data_kb: number;
  daily_data_gb: number;
  monthly_data_gb: number;
  avg_storage_gb: number;
  avg_storage_tb: number;
  segments_per_event?: number;
  segments_per_day: number;
  monthly_puts: number;
  monthly_gets: number;
  monthly_retrieval_gb: number;
  monthly_transfer_gb: number;
  // 访问模式相关指标（时间衰减模式增强）
  access_pattern_mode?: 'simple' | 'time_decay';
  weighted_access_pattern?: number;
  access_pattern_stages?: AccessPatternStageSnapshot[];
}

// ============================================================
// 费用明细
// ============================================================

export interface TierDetailSnapshot {
  tier_name: string;
  range_start_gb: number;
  range_end_gb?: number;
  unit_price: number;
  quantity_gb: number;
  amount: number;
}

export interface CostItemDetail {
  name: string;
  unit_price: number;
  unit_price_unit: string;
  quantity: number;
  quantity_unit: string;
  amount: number;
  tiers?: TierDetailSnapshot[];
}

export interface StageCostDetail {
  stage_index: number;
  start_day: number;
  end_day: number;
  duration_days: number;
  storage_class: string;
  // 访问比例（时间衰减模式增强）
  access_rate?: number;
  storage_cost: CostItemDetail;
  put_request_cost: CostItemDetail;
  get_request_cost: CostItemDetail;
  retrieval_cost?: CostItemDetail;
  transition_cost?: CostItemDetail;
  data_transfer_cost?: CostItemDetail;
  stage_total: number;
}

// ============================================================
// 费用汇总
// ============================================================

export interface CostBreakdownPercent {
  storage: number;
  put_requests: number;
  get_requests: number;
  retrieval: number;
  lifecycle: number;
  data_transfer: number;
}

export interface CostSummaryDetail {
  storage_cost: number;
  put_request_cost: number;
  get_request_cost: number;
  retrieval_cost: number;
  lifecycle_cost: number;
  data_transfer_cost: number;
  subtotal: number;
  discount_amount: number;
  total_cost: number;
  cost_per_device: number;
  cost_per_gb: number;
  breakdown_percent: CostBreakdownPercent;
}

// ============================================================
// 定价快照
// ============================================================

export interface StorageClassPricing {
  storage_per_gb: number;
  put_per_1000: number;
  get_per_1000: number;
  retrieval_per_gb?: number;
  transition_per_1000?: number;
}

export interface DataTransferTier {
  tier_name: string;
  start_gb: number;
  end_gb?: number;
  price_per_gb: number;
}

export interface PricingSnapshot {
  region: string;
  region_name: string;
  currency: string;
  snapshot_date: string;
  storage_pricing: Record<string, StorageClassPricing>;
  data_transfer_tiers: DataTransferTier[];
}

// ============================================================
// 核算记录
// ============================================================

export interface CalculationRecord {
  record_id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  storage_strategy: StorageStrategy;
  input_params: InputParameterSnapshot;
  intermediate_metrics: IntermediateMetricsDetail;
  stage_details: StageCostDetail[];
  cost_summary: CostSummaryDetail;
  pricing_snapshot: PricingSnapshot;
}

export interface CalculationRecordSummary {
  record_id: string;
  name: string;
  storage_strategy: StorageStrategy;
  total_cost: number;
  created_at: string;
}

export interface CalculationRecordListResponse {
  items: CalculationRecordSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================
// API 请求/响应
// ============================================================

export interface CreateCalculationRecordRequest {
  name: string;
  description?: string;
}

export interface DetailedCalculationResult {
  summary: CostSummaryDetail;
  intermediate_metrics: IntermediateMetricsDetail;
  stage_details: StageCostDetail[];
  storage_strategy: StorageStrategy;
  pricing_snapshot: PricingSnapshot;
  data_transfer_tiers?: TierDetailSnapshot[];
}

export interface RecordCountResponse {
  count: number;
  max_count: number;
  can_create: boolean;
}
