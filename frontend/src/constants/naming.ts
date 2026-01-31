/**
 * 命名规范常量
 * 统一项目中的命名约定，提高代码一致性
 */

/**
 * CSS 类名前缀
 * 使用 BEM 命名规范：block__element--modifier
 */
export const CSS_PREFIX = {
  // 页面级组件
  PAGE: 'ipc',

  // 计算器模块
  CALCULATOR: 'calc',
  INPUT_PANEL: 'input-panel',
  RESULT_DISPLAY: 'result',

  // 表单相关
  FORM: 'form',
  FORM_GROUP: 'form-group',
  FORM_FIELD: 'form-field',

  // 通用组件
  CARD: 'card',
  TABLE: 'table',
  CHART: 'chart',
  DIALOG: 'dialog',
} as const;

/**
 * 数据属性名称规范
 * 用于测试和数据追踪
 */
export const DATA_ATTR = {
  TEST_ID: 'data-testid',
  TRACK_ID: 'data-track',
  MODULE: 'data-module',
} as const;

/**
 * 构建 CSS 类名的辅助函数
 */
export function buildClassName(
  block: string,
  element?: string,
  modifier?: string
): string {
  let className = block;
  if (element) {
    className += `__${element}`;
  }
  if (modifier) {
    className += `--${modifier}`;
  }
  return className;
}

/**
 * 合并多个类名
 */
export function classNames(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 组件显示名称规范
 */
export const COMPONENT_DISPLAY_NAMES = {
  // 计算器组件
  InputPanel: 'InputPanel',
  ResultDisplay: 'ResultDisplay',
  FunctionalForm: 'FunctionalForm',
  TechnicalForm: 'TechnicalForm',
  PricingForm: 'PricingForm',

  // 结果展示组件
  CostBreakdownTable: 'CostBreakdownTable',
  CostPieChart: 'CostPieChart',
  SensitivityAnalysis: 'SensitivityAnalysis',

  // 对比组件
  ComparisonPanel: 'ComparisonPanel',
  ComparisonDisplay: 'ComparisonDisplay',
  ComparisonChart: 'ComparisonChart',

  // 通用组件
  FormField: 'FormField',
  FormLabel: 'FormLabel',
  LoadingSpinner: 'LoadingSpinner',
  CardSkeleton: 'CardSkeleton',
  TableSkeleton: 'TableSkeleton',
} as const;

/**
 * 事件名称规范
 */
export const EVENT_NAMES = {
  // 表单事件
  FORM_SUBMIT: 'form:submit',
  FORM_CHANGE: 'form:change',
  FORM_RESET: 'form:reset',

  // 计算事件
  CALC_START: 'calc:start',
  CALC_SUCCESS: 'calc:success',
  CALC_ERROR: 'calc:error',

  // 用户交互
  BUTTON_CLICK: 'button:click',
  TAB_CHANGE: 'tab:change',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
} as const;

/**
 * 状态名称规范
 */
export const STATE_NAMES = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  IDLE: 'idle',
  PENDING: 'pending',
  DISABLED: 'disabled',
  ACTIVE: 'active',
} as const;