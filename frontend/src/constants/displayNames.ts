/**
 * 统一的显示名称常量
 *
 * 为所有枚举类型提供中文显示名称的统一数据源
 */

/**
 * 录像模式显示名称
 */
export const RECORDING_MODE_NAMES: Record<string, string> = {
  event_triggered: '事件触发',
  continuous: '7x24 连续',
  scheduled: '定时录像',
};

/**
 * 视频质量显示名称
 * 注意：键名必须与类型定义 VideoQuality 保持一致（区分大小写）
 */
export const VIDEO_QUALITY_NAMES: Record<string, string> = {
  '4K': '4K (3840x2160)',
  '2K': '2K (2560x1440)',
  '1080p': '1080P (1920x1080)',
  '720p': '720P (1280x720)',
  '480p': '480P (854x480)',
};

/**
 * 分片策略显示名称
 */
export const SEGMENT_STRATEGY_NAMES: Record<string, string> = {
  time_based: '按时间分片',
  size_based: '按大小分片',
};

/**
 * 获取录像模式的显示名称
 */
export function getRecordingModeName(mode: string): string {
  return RECORDING_MODE_NAMES[mode] || mode;
}

/**
 * 获取视频质量的显示名称
 */
export function getVideoQualityName(quality: string): string {
  return VIDEO_QUALITY_NAMES[quality] || quality;
}

/**
 * 获取分片策略的显示名称
 */
export function getSegmentStrategyName(strategy: string): string {
  return SEGMENT_STRATEGY_NAMES[strategy] || strategy;
}

/**
 * 页面/功能模块显示名称
 * 用于统一管理导航、面包屑等 UI 元素的命名
 */
export const PAGE_NAMES = {
  // 成本分析模块
  costAnalysis: '成本分析',
  quickCompare: '快速对比',
  detailedEval: '详细评估',
  // 历史记录模块
  historyRecords: '历史记录',
  detailedRecords: '详细评估记录',
  legacyRecords: '旧版评估',
} as const;

/**
 * 功能描述文案
 */
export const FEATURE_DESCRIPTIONS = {
  quickCompare: '实时对比多种存储方案，快速了解成本差异',
  detailedEval: '深入分析成本构成，支持保存评估记录',
  historyEmpty: '还没有保存的评估记录，前往「成本分析 → 详细评估」创建',
} as const;