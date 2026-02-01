/**
 * URL 参数处理工具函数
 */

/**
 * 从 URL 参数中安全解析 ID 列表
 * @param idsParam 逗号分隔的 ID 字符串
 * @returns 解析后的 ID 数组
 */
export function parseIdList(idsParam: string): string[] {
  return idsParam
    .split(',')
    .map((id) => decodeURIComponent(id.trim()))
    .filter((id) => id.length > 0);
}

/**
 * 将 ID 列表编码为 URL 参数
 * @param ids ID 数组
 * @returns 编码后的字符串
 */
export function encodeIdList(ids: string[]): string {
  return ids.map((id) => encodeURIComponent(id)).join(',');
}