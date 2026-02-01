/**
 * 统一配色数据源
 *
 * 配色设计原则：
 * - 方案色与语义色分离，避免一色多义
 * - 蓝青紫靛色系用于方案标识（纯标识，无语义）
 * - 绿色专用于"节省/正向"语义
 * - 橙色专用于"提醒"语义
 * - 移除红色，保持专业中性风格
 */

/**
 * 方案标识色 - 用于区分不同方案
 *
 * 设计理由：
 * - 蓝青紫靛色系，色相差异明显，便于区分
 * - 不使用绿色和橙色，避免与语义色冲突
 */
export const SCHEME_COLORS = {
  /** 方案1：品牌蓝 - 专业可信 */
  scheme1: '#1890ff',
  /** 方案2：青碧色 - 与蓝色协调，替代绿色 */
  scheme2: '#13c2c2',
  /** 方案3：极光紫 - 色相差异大，替代橙色 */
  scheme3: '#722ed1',
  /** 方案4：深邃靛 - 补充蓝紫区间 */
  scheme4: '#2f54eb',
} as const;

/** 方案标识色数组 */
export const SCHEME_COLOR_LIST = [
  SCHEME_COLORS.scheme1,
  SCHEME_COLORS.scheme2,
  SCHEME_COLORS.scheme3,
  SCHEME_COLORS.scheme4,
] as const;

/**
 * 语义功能色 - 用于表达特定含义
 */
export const SEMANTIC_COLORS = {
  /** 节省/正向结果 - 专用绿色 */
  saving: '#52c41a',
  /** 提醒/警示 - 专用橙色 */
  warning: '#faad14',
  /** 中性文字 - 深灰 */
  neutral: '#262626',
  /** 次要文字 - 中灰 */
  secondary: '#8c8c8c',
  /** 基准参考 - 灰色 */
  baseline: '#8c8c8c',
  /** 品牌/推荐 - 蓝色 */
  brand: '#1890ff',
} as const;

/**
 * 费用项色板 - 用于成本明细图表
 *
 * 设计理由：
 * - 统一使用 Ant Design 色系，保持一致性
 * - 移除红色（原数据检索费），改用紫色
 * - 色相分布均匀，便于视觉区分
 */
export const COST_ITEM_PALETTE = {
  /** 存储费用 - 品牌蓝 */
  storage: '#1890ff',
  /** PUT请求费 - 青色 */
  put_request: '#36cfc9',
  /** GET请求费 - 浅绿 */
  get_request: '#73d13d',
  /** 数据检索费 - 紫色（移除红色） */
  retrieval: '#9254de',
  /** 数据传输费 - 浅蓝 */
  data_transfer: '#40a9ff',
  /** 生命周期费 - 浅紫 */
  lifecycle: '#b37feb',
} as const;

/**
 * 结论区样式配置
 */
export const CONCLUSION_STYLES = {
  /** 结论卡片背景渐变 */
  background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)',
  /** 洞察区背景 - 改为中性灰 */
  insightBackground: '#f6f8fa',
  /** 洞察区边框 - 改为中性灰 */
  insightBorder: '#e1e4e8',
  /** 洞察区图标颜色 - 改为品牌蓝 */
  insightIcon: '#1890ff',
} as const;

/**
 * 高亮颜色
 */
export const HIGHLIGHT_COLORS = {
  /** 最优值/推荐方案 - 品牌蓝 */
  best: '#1890ff',
  /** 参考基准 - 中性灰 */
  baseline: '#8c8c8c',
  /** 节省金额高亮 - 绿色 */
  saving: '#52c41a',
} as const;

/**
 * 卡片样式配置
 */
export const CARD_STYLES = {
  /** 推荐方案卡片 - 柔和视觉差异 */
  recommended: {
    background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
    borderColor: '#91caff',  // 浅蓝色，更柔和
    borderWidth: 1,          // 1px 边框
    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.08)', // 更柔和的阴影
  },
  /** 非推荐方案卡片 */
  normal: {
    background: '#fafafa',
    borderColor: '#f0f0f0',  // 更浅的灰色
    borderWidth: 1,
  },
} as const;
