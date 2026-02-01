/**
 * 统一的错误处理工具函数
 */
import { message } from 'antd';
import type { NavigateFunction } from 'react-router-dom';

/**
 * Axios 错误类型
 */
export interface AxiosErrorType {
  response?: {
    status?: number;
    data?: {
      detail?: string;
    };
  };
}

/**
 * 处理 API 错误的统一函数
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 * @param navigate 路由导航函数（可选，用于 401 跳转）
 * @returns 错误详情字符串
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string,
  navigate?: NavigateFunction
): string {
  const axiosError = error as AxiosErrorType;

  // 处理 401 未授权错误
  if (axiosError.response?.status === 401 && navigate) {
    message.warning('请先登录');
    navigate('/settings');
    return '请先登录';
  }

  // 提取错误详情
  const detail = axiosError.response?.data?.detail || defaultMessage;

  // 显示错误消息
  message.error(detail);

  return detail;
}

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