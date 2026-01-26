/**
 * 格式化工具函数
 */

/**
 * 格式化金额
 * @param val 金额数值
 * @returns 格式化后的金额字符串
 */
export function formatAmount(val: number): string {
  if (val === 0) return '-';
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 格式化单价
 * @param price 单价数值
 * @param unit 单位
 * @returns 格式化后的单价字符串
 */
export function formatUnitPrice(price: number, unit: string): string {
  if (price === 0) return '-';
  const decimals = price < 0.001 ? 5 : price < 0.01 ? 4 : price < 0.1 ? 3 : 2;
  return `$${price.toFixed(decimals)}${unit}`;
}

/**
 * 格式化推荐理由文本，将百分比数字加粗（需要在 React 组件中调用）
 * 注意：这个函数已移动到组件中实现，因为它返回 React 节点
 */

/**
 * 格式化数据量（自动选择合适的单位）
 * @param bytes 字节数
 * @returns 格式化后的数据量字符串
 */
export function formatDataSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

/**
 * 格式化请求数量（自动选择合适的单位）
 * @param count 请求数量
 * @returns 格式化后的请求数量字符串
 */
export function formatRequestCount(count: number): string {
  if (count === 0) return '0';

  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(1)} 亿次`;
  }
  if (count >= 10000) {
    return `${(count / 10000).toFixed(0)} 万次`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)} 千次`;
  }

  return `${count} 次`;
}

/**
 * 格式化百分比
 * @param value 数值（0-1 之间的小数）
 * @param decimals 小数位数
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}