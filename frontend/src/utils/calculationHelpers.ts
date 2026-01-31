/**
 * 计算相关的辅助函数
 */

// 视频质量对应的数据速率 (KB/s)
export const VIDEO_QUALITY_DATA_RATES: Record<string, number> = {
  '720p': 125,
  '1080p': 312.5,
  '2K': 625,
  '4K': 1500,
};

/**
 * 获取视频质量对应的数据速率
 */
export function getVideoDataRate(quality: string): number {
  return VIDEO_QUALITY_DATA_RATES[quality] || 312.5;
}

/**
 * 格式化大数字（K/M后缀）
 */
export function formatLargeNumber(value: number, decimals: number = 2): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

/**
 * 安全计算百分比
 */
export function calculatePercentage(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

/**
 * 生成录像模式的描述
 */
export function getRecordingModeDescription(mode: string): string {
  switch (mode) {
    case 'event_triggered':
      return '事件触发录像';
    case 'continuous':
      return '连续录像';
    case 'scheduled':
      return '定时录像';
    default:
      return mode;
  }
}

/**
 * 生成存储策略的描述
 */
export function getStorageStrategyDescription(strategy: string): string {
  switch (strategy) {
    case 'single_standard':
      return '单一 S3 Standard';
    case 'single_glacier_ir':
      return '单一 Glacier IR';
    case 'lifecycle_std_glacier':
      return '生命周期: Standard → Glacier';
    case 'lifecycle_multi_stage':
      return '生命周期: 多阶段';
    default:
      return strategy;
  }
}

/**
 * 生成分片策略的描述
 */
export function getSegmentStrategyDescription(strategy: string): string {
  switch (strategy) {
    case 'fixed_duration':
      return '固定时长';
    case 'fixed_size':
      return '固定大小';
    case 'realtime_stream':
      return '实时流';
    default:
      return strategy;
  }
}

/**
 * 计算每日录像秒数
 */
export function calculateDailyRecordingSeconds(
  mode: string,
  eventsPerDay?: number,
  eventDurationSec?: number,
  scheduledHours?: number
): number {
  switch (mode) {
    case 'event_triggered':
      return ((eventsPerDay || 0) * (eventDurationSec || 0));
    case 'continuous':
      return 86400; // 24小时
    case 'scheduled':
      return (scheduledHours || 0) * 3600;
    default:
      return 0;
  }
}

/**
 * 生成计算公式描述
 */
export interface FormulaDescriptor {
  getDailyRecordingFormula: () => string;
  getDailyDataFormula: () => string;
  getMonthlyDataFormula: () => string;
  getAvgStorageFormula: () => string;
  getSegmentsPerDayFormula: () => string;
  getMonthlyPutsFormula: () => string;
  getMonthlyGetsFormula: () => string;
  getMonthlyRetrievalFormula: () => string;
}

/**
 * 创建公式生成器
 */
export function createFormulaGenerator(
  input: { functional?: any; technical?: any },
  metrics: {
    daily_recording_seconds: number;
    daily_data_gb: number;
    segments_per_day: number;
    monthly_puts: number;
    access_pattern_mode?: string;
    weighted_access_pattern?: number;
  }
): FormulaDescriptor {
  const f = input?.functional;
  const t = input?.technical;
  const dataRateKb = getVideoDataRate(f?.video_quality || '1080p');

  return {
    getDailyRecordingFormula: () => {
      if (!f) return '';
      switch (f.recording_mode) {
        case 'event_triggered':
          return `${f.events_per_day || 0} × ${f.event_duration_sec || 0} ÷ 3600`;
        case 'continuous':
          return '86400 ÷ 3600 = 24';
        case 'scheduled':
          return `${f.scheduled_hours || 0}`;
        default:
          return '';
      }
    },

    getDailyDataFormula: () => {
      if (!f) return '';
      const dailySeconds = metrics.daily_recording_seconds;
      return `${f.device_count} × ${dataRateKb} × ${dailySeconds.toFixed(0)} ÷ 1024²`;
    },

    getMonthlyDataFormula: () => {
      return `${metrics.daily_data_gb.toFixed(4)} × 30`;
    },

    getAvgStorageFormula: () => {
      if (!f) return '';
      return `${metrics.daily_data_gb.toFixed(4)} × ${f.retention_days}`;
    },

    getSegmentsPerDayFormula: () => {
      if (!f) return '';
      const dailySeconds = metrics.daily_recording_seconds;
      const segmentStrategy = t?.lifecycle_policy?.enabled
        ? 'fixed_duration'
        : (f.segment_strategy || 'fixed_duration');
      const segmentValue = f.segment_value || 15;

      if (segmentStrategy === 'fixed_duration') {
        return `${dailySeconds.toFixed(0)} ÷ ${segmentValue}`;
      }
      if (segmentStrategy === 'fixed_size') {
        const dailyDataKbPerDevice = (metrics.daily_data_gb * 1024 * 1024) / f.device_count;
        return `${dailyDataKbPerDevice.toFixed(0)} ÷ ${segmentValue}`;
      }
      if (segmentStrategy === 'realtime_stream') {
        return `${dailySeconds.toFixed(0)} (每秒1次)`;
      }
      return '';
    },

    getMonthlyPutsFormula: () => {
      if (!f) return '';
      return `${f.device_count} × ${metrics.segments_per_day.toFixed(2)} × 30`;
    },

    getMonthlyGetsFormula: () => {
      if (!f) return '';
      if (metrics.access_pattern_mode === 'time_decay' && metrics.weighted_access_pattern !== undefined) {
        return `${formatLargeNumber(metrics.monthly_puts)} × ${(metrics.weighted_access_pattern * 100).toFixed(2)}% (加权)`;
      }
      return `${formatLargeNumber(metrics.monthly_puts)} × ${f.access_pattern}`;
    },

    getMonthlyRetrievalFormula: () => {
      if (!f) return '';
      return `${metrics.daily_data_gb.toFixed(4)} × 30 × ${f.access_pattern}`;
    },
  };
}