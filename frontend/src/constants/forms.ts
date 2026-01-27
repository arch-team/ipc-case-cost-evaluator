/**
 * 表单相关常量配置
 */

import type { RecordingMode, VideoQuality, StorageClass } from '../types';

/** 录像模式选项 */
export const RECORDING_MODE_OPTIONS: Array<{ value: RecordingMode; label: string }> = [
  { value: 'continuous', label: '全天候录像' },
  { value: 'event_triggered', label: '事件触发' },
  { value: 'scheduled', label: '定时录像' },
];

/** 视频质量选项 */
export const VIDEO_QUALITY_OPTIONS: Array<{
  value: VideoQuality;
  label: string;
  dataRate: string;
}> = [
  { value: '720p', label: '720P (高清)', dataRate: '125 KB/s' },
  { value: '1080p', label: '1080P (全高清)', dataRate: '312.5 KB/s' },
  { value: '2k', label: '2K (超清)', dataRate: '625 KB/s' },
  { value: '4k', label: '4K (超高清)', dataRate: '1500 KB/s' },
];

/** 存储类型选项 */
export const STORAGE_CLASS_OPTIONS: Array<{
  value: StorageClass;
  label: string;
  price: string;
  hint: string;
  color: string;
}> = [
  {
    value: 'STANDARD',
    label: 'S3 Standard',
    price: '$0.025/GB',
    hint: '频繁访问，毫秒级延迟',
    color: 'blue',
  },
  {
    value: 'INTELLIGENT_TIERING',
    label: 'Intelligent-Tiering',
    price: '$0.025/GB',
    hint: '自动分层，访问模式不确定',
    color: 'cyan',
  },
  {
    value: 'STANDARD_IA',
    label: 'Standard-IA',
    price: '$0.014/GB',
    hint: '不频繁访问，毫秒级延迟',
    color: 'geekblue',
  },
  {
    value: 'ONEZONE_IA',
    label: 'One Zone-IA',
    price: '$0.011/GB',
    hint: '单可用区，成本更低',
    color: 'green',
  },
  {
    value: 'GLACIER_IR',
    label: 'Glacier Instant',
    price: '$0.004/GB',
    hint: '即时检索归档，毫秒级',
    color: 'purple',
  },
  {
    value: 'GLACIER_FR',
    label: 'Glacier Flexible',
    price: '$0.004/GB',
    hint: '灵活检索，分钟到小时',
    color: 'volcano',
  },
  {
    value: 'DEEP_ARCHIVE',
    label: 'Deep Archive',
    price: '$0.001/GB',
    hint: '深度归档，12-48小时检索',
    color: 'orange',
  },
];

/** 分片策略选项 */
export const SEGMENT_STRATEGY_OPTIONS = [
  { value: 'fixed_duration', label: '固定时长' },
  { value: 'fixed_size', label: '固定大小' },
  { value: 'realtime_stream', label: '实时流' },
];

/** 表单提示信息 */
export const FORM_TOOLTIPS = {
  deviceCount: '需要评估的 IPC 设备总数',
  recordingMode: '全天候：24小时不间断录像；事件触发：仅在检测到事件时录像；定时录像：按预设时间段录像',
  videoQuality: '视频分辨率，质量越高数据量越大',
  retentionDays: '视频数据在云端保留的天数',
  eventsPerDay: '每个设备每天检测到事件的次数',
  eventDuration: '每次事件触发的录像时长',
  scheduledHours: '每天的录像时长（小时）',
  accessPattern: '视频数据被回看的比例，影响 GET 请求和数据传输成本',
  segmentStrategy: '视频文件的分片方式，影响 PUT 请求数量',
  segmentValue: '分片的大小或时长',
  storageClass: '存储类型选择：Standard 适合频繁访问，Glacier IR 适合低频访问',
};

/** 默认表单值 */
export const DEFAULT_FORM_VALUES = {
  deviceCount: 100,
  retentionDays: 30,
  eventsPerDay: 400,
  eventDurationSec: 15,
  scheduledHours: 8,
  segmentValue: 60,
  accessPattern: 0.1,
  discountPercent: 0,
};