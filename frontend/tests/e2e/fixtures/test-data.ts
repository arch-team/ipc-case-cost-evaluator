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

/**
 * 精度验证测试配置 - 家庭场景（小规模，便于验证精度）
 * 用于测试数值精度和格式显示
 */
export const precisionTestConfig = {
  deviceCount: 10,
  recordingMode: '事件触发',
  videoQuality: '1080p',
  eventsPerDay: 50,
  eventDuration: 15,
  retentionDays: 7,
  accessPattern: 0.1,
  storageClass: 'STANDARD',
  region: 'ap-northeast-1',
  discount: 0,
};

/**
 * 大规模测试配置 - 企业场景
 * 用于验证大数值处理和千分位显示
 */
export const largeValueTestConfig = {
  deviceCount: 5000,
  recordingMode: '全天候录像',
  videoQuality: '4K',
  retentionDays: 90,
  accessPattern: 0.3,
  storageClass: 'STANDARD',
  region: 'ap-northeast-1',
  discount: 0,
};

/**
 * 最小值测试配置 - 边界场景
 * 用于测试零值和最小值处理
 */
export const minValueTestConfig = {
  deviceCount: 1,
  recordingMode: '事件触发',
  videoQuality: '720p',
  eventsPerDay: 1,
  eventDuration: 5,
  retentionDays: 1,
  accessPattern: 0.01,
  storageClass: 'STANDARD',
  region: 'ap-northeast-1',
  discount: 0,
};

/**
 * Glacier IR 测试配置
 * 用于测试包含检索费用和生命周期费用的场景
 */
export const glacierTestConfig = {
  deviceCount: 100,
  recordingMode: '事件触发',
  videoQuality: '1080p',
  eventsPerDay: 200,
  eventDuration: 20,
  retentionDays: 30,
  accessPattern: 0.15,
  storageClass: 'GLACIER_IR',
  region: 'ap-northeast-1',
  discount: 0,
};

/**
 * 期望的表格列数（包含展开按钮列）
 */
export const expectedTableColumns = 7;

/**
 * 期望的费用类型名称
 */
export const expectedCostTypes = {
  storage: '存储费用',
  put: 'PUT 请求费用',
  get: 'GET 请求费用',
  retrieval: '检索费用',
  transfer: '数据传输费用',
  lifecycle: '生命周期转换费用',
};

/**
 * 精度验证容差配置
 */
export const tolerances = {
  yearlyMonthlyRatio: 0.01, // 年度/月度比例容差
  percentSum: 0.5, // 占比总和容差（允许 ±0.5%）
  costCalculation: 0.01, // 费用计算容差
};

/**
 * 数值格式正则表达式
 */
export const formatPatterns = {
  monetary2: /^\$[\d,]+\.\d{2}$/, // 2位小数货币 $X.XX
  monetary4: /^\$[\d,]+\.\d{4}$/, // 4位小数货币 $X.XXXX
  unitPrice: /^\$[\d.]+\/[\w\-/月]+$/, // 单价格式 $X.XXXX/单位
  integer: /^[\d,]+$/, // 整数（可带千分位）
  percentage: /^\d+(\.\d+)?%$/, // 百分比 X.X%
};
