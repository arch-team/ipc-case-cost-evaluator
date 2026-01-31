/**
 * 表单相关常量配置
 */

import type { RecordingMode, VideoQuality } from '../types';
import { STORAGE_CLASS_SELECT_OPTIONS } from './storageClasses';

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
  { value: '2K', label: '2K (超清)', dataRate: '625 KB/s' },
  { value: '4K', label: '4K (超高清)', dataRate: '1500 KB/s' },
];

/**
 * 存储类型选项
 *
 * 注意：价格数据从后端 API 动态获取，不在此处硬编码
 * 数据源：./storageClasses.ts
 */
export const STORAGE_CLASS_OPTIONS = STORAGE_CLASS_SELECT_OPTIONS;

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