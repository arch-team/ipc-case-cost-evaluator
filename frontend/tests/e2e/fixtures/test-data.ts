/**
 * E2E 测试数据
 */

/**
 * 标准测试输入配置
 */
export const standardInput = {
  deviceCount: 100,
  recordingMode: '事件触发',
  videoQuality: '1080p',
  eventsPerDay: 400,
  eventDuration: 15,
  retentionDays: 30,
  accessPattern: 0.1,
  storageClass: 'STANDARD',
  region: 'ap-northeast-1',
  discount: 0,
};

/**
 * 小规模配置（边界值测试）
 */
export const smallScaleInput = {
  deviceCount: 1,
  recordingMode: '事件触发',
  videoQuality: '720p',
  eventsPerDay: 10,
  eventDuration: 10,
  retentionDays: 7,
  accessPattern: 0.05,
};

/**
 * 大规模配置
 */
export const largeScaleInput = {
  deviceCount: 10000,
  recordingMode: '全天候录像',
  videoQuality: '4K',
  retentionDays: 90,
  accessPattern: 0.3,
};

/**
 * 事件触发模式配置
 */
export const eventTriggeredConfig = {
  deviceCount: 50,
  recordingMode: '事件触发',
  eventsPerDay: 200,
  eventDuration: 20,
  retentionDays: 14,
};

/**
 * 全天候模式配置
 */
export const continuousConfig = {
  deviceCount: 50,
  recordingMode: '全天候录像',
  retentionDays: 30,
};

/**
 * 定时段模式配置
 */
export const scheduledConfig = {
  deviceCount: 100,
  recordingMode: '定时录像',
  retentionDays: 30,
};

/**
 * 录像模式选项
 */
export const recordingModes = {
  eventTriggered: '事件触发',
  continuous: '全天候录像',
  scheduled: '定时录像',
};

/**
 * 视频质量选项
 */
export const videoQualities = {
  '720p': '720p',
  '1080p': '1080p',
  '2K': '2K',
  '4K': '4K',
};

/**
 * 存储类型选项
 */
export const storageClasses = {
  standard: 'STANDARD',
  glacierIR: 'GLACIER_IR',
};

/**
 * 预设场景名称（用于测试场景选择）
 */
export const presetScenarios = {
  // 零售场景
  retailSmall: '便利店',
  retailMedium: '连锁超市',
  retailLarge: '购物中心',
  // 企业场景
  enterpriseSmall: '小型办公室',
  enterpriseMedium: '中型企业',
  // 其他场景
  residential: '智慧社区',
  traffic: '城市交通',
};

/**
 * 期望的 UI 元素文本
 */
export const expectedTexts = {
  pageTitle: '成本计算',
  scenarioStepTitle: '选择场景',
  functionalStepTitle: '功能配置',
  technicalStepTitle: '技术选项',
  pricingStepTitle: '价格设置',
  resultStepTitle: '计算结果',
  customConfig: '自定义配置',
  nextButton: '下一步',
  prevButton: '上一步',
  calculateButton: '开始计算',
  resetButton: '重新计算',
  exportButton: '导出 Excel',
};

/**
 * API 端点
 */
export const apiEndpoints = {
  calculate: '/api/v1/calculate',
  compare: '/api/v1/compare',
  scenarios: '/api/v1/scenarios',
  export: '/api/v1/export',
};

/**
 * 超时配置
 */
export const timeouts = {
  pageLoad: 10000,
  apiCall: 30000,
  animation: 500,
  scenarioLoad: 15000,
};
