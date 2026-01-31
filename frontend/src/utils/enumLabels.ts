/**
 * 枚举值中文标签映射
 *
 * 提供各种枚举值的中文友好显示标签，用于在 UI 中展示。
 */

/**
 * 录像模式标签
 */
export const recordingModeLabels: Record<string, string> = {
  continuous: '连续录像',
  event_triggered: '事件触发',
  scheduled: '定时录像',
};

/**
 * 视频质量标签
 */
export const videoQualityLabels: Record<string, { label: string; bitrate: string }> = {
  '720p': { label: '720P 高清', bitrate: '1 Mbps' },
  '1080p': { label: '1080P 全高清', bitrate: '2.5 Mbps' },
  '2k': { label: '2K 超清', bitrate: '5 Mbps' },
  '4k': { label: '4K 超高清', bitrate: '12 Mbps' },
};

/**
 * 存储类型标签
 */
export const storageClassLabels: Record<string, { label: string; color: string }> = {
  STANDARD: { label: 'S3 Standard', color: 'blue' },
  GLACIER_IR: { label: 'S3 Glacier IR', color: 'purple' },
  DEEP_ARCHIVE: { label: 'S3 Deep Archive', color: 'orange' },
  INTELLIGENT_TIERING: { label: 'S3 Intelligent-Tiering', color: 'cyan' },
};

/**
 * 分片策略标签
 */
export const segmentStrategyLabels: Record<string, string> = {
  by_time: '按时长分片',
  by_size: '按大小分片',
  hybrid: '混合分片',
};

/**
 * 存储策略标签
 */
export const storageStrategyLabels: Record<string, { label: string; color: string }> = {
  single_standard: { label: 'S3 Standard 单一存储', color: 'blue' },
  single_glacier_ir: { label: 'Glacier IR 单一存储', color: 'cyan' },
  lifecycle_std_glacier: { label: 'Standard → Glacier 生命周期', color: 'purple' },
  lifecycle_multi_stage: { label: '多阶段生命周期策略', color: 'magenta' },
};

/**
 * AWS 区域标签
 */
export const regionLabels: Record<string, string> = {
  'us-east-1': '美国东部 (弗吉尼亚北部)',
  'us-east-2': '美国东部 (俄亥俄)',
  'us-west-1': '美国西部 (加利福尼亚北部)',
  'us-west-2': '美国西部 (俄勒冈)',
  'ap-northeast-1': '亚太地区 (东京)',
  'ap-northeast-2': '亚太地区 (首尔)',
  'ap-northeast-3': '亚太地区 (大阪)',
  'ap-south-1': '亚太地区 (孟买)',
  'ap-southeast-1': '亚太地区 (新加坡)',
  'ap-southeast-2': '亚太地区 (悉尼)',
  'eu-central-1': '欧洲 (法兰克福)',
  'eu-west-1': '欧洲 (爱尔兰)',
  'eu-west-2': '欧洲 (伦敦)',
  'eu-west-3': '欧洲 (巴黎)',
  'sa-east-1': '南美洲 (圣保罗)',
  'cn-north-1': '中国 (北京)',
  'cn-northwest-1': '中国 (宁夏)',
};

/**
 * 获取录像模式标签
 */
export function getRecordingModeLabel(mode: string): string {
  return recordingModeLabels[mode] || mode;
}

/**
 * 获取视频质量标签
 */
export function getVideoQualityLabel(quality: string): string {
  const info = videoQualityLabels[quality];
  return info ? `${info.label} (${info.bitrate})` : quality;
}

/**
 * 获取存储类型标签
 */
export function getStorageClassLabel(storageClass: string): string {
  return storageClassLabels[storageClass]?.label || storageClass;
}

/**
 * 获取存储类型颜色
 */
export function getStorageClassColor(storageClass: string): string {
  return storageClassLabels[storageClass]?.color || 'default';
}

/**
 * 获取分片策略标签
 */
export function getSegmentStrategyLabel(strategy: string): string {
  return segmentStrategyLabels[strategy] || strategy;
}

/**
 * 获取存储策略标签
 */
export function getStorageStrategyLabel(strategy: string): string {
  return storageStrategyLabels[strategy]?.label || strategy;
}

/**
 * 获取存储策略颜色
 */
export function getStorageStrategyColor(strategy: string): string {
  return storageStrategyLabels[strategy]?.color || 'default';
}

/**
 * 获取 AWS 区域标签
 */
export function getRegionLabel(region: string): string {
  return regionLabels[region] || region;
}
