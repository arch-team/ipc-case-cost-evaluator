/**
 * 统一的错误处理工具
 * 提供结构化的错误类型和处理函数
 */
import { message } from 'antd';
import type { NavigateFunction } from 'react-router-dom';

/**
 * 错误代码常量
 */
export const ErrorCode = {
  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // API 错误
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 业务错误
  CALCULATION_FAILED: 'CALCULATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  PRICING_NOT_AVAILABLE: 'PRICING_NOT_AVAILABLE',

  // 客户端错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * 应用错误类
 */
export class AppError extends Error {
  code: ErrorCode;
  details?: Record<string, any>;
  statusCode?: number;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }

  /**
   * 显示错误消息
   */
  show(): void {
    message.error(this.message);
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.NETWORK_ERROR:
        return '网络连接失败，请检查网络设置';
      case ErrorCode.TIMEOUT:
        return '请求超时，请稍后重试';
      case ErrorCode.UNAUTHORIZED:
        return '请先登录';
      case ErrorCode.FORBIDDEN:
        return '您没有权限执行此操作';
      case ErrorCode.NOT_FOUND:
        return '请求的资源不存在';
      case ErrorCode.VALIDATION_ERROR:
        return this.details?.field
          ? `${this.details.field}: ${this.message}`
          : this.message;
      case ErrorCode.CALCULATION_FAILED:
        return '计算失败，请检查输入参数';
      case ErrorCode.PRICING_NOT_AVAILABLE:
        return `该区域的定价数据暂不可用`;
      default:
        return this.message || '操作失败，请稍后重试';
    }
  }
}

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
 * 从 API 响应创建错误
 */
export function createErrorFromResponse(response: any, statusCode: number): AppError {
  if (response?.detail) {
    const detail = response.detail;

    // 处理结构化错误响应
    if (typeof detail === 'object' && detail.code) {
      return new AppError(
        detail.code as ErrorCode,
        detail.message || '请求失败',
        detail.details,
        statusCode
      );
    }

    // 处理字符串错误消息
    if (typeof detail === 'string') {
      return new AppError(
        ErrorCode.API_ERROR,
        detail,
        undefined,
        statusCode
      );
    }
  }

  // 默认错误
  return new AppError(
    ErrorCode.API_ERROR,
    `请求失败 (${statusCode})`,
    undefined,
    statusCode
  );
}

/**
 * 错误处理装饰器（用于异步函数）
 */
export function handleError(
  options: {
    showMessage?: boolean;
    fallbackMessage?: string;
    rethrow?: boolean;
  } = {}
) {
  const { showMessage = true, fallbackMessage, rethrow = false } = options;

  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const appError = error instanceof AppError
          ? error
          : new AppError(
              ErrorCode.UNKNOWN_ERROR,
              fallbackMessage || '操作失败',
              undefined
            );

        if (showMessage) {
          message.error(appError.getUserMessage());
        }

        console.error(`Error in ${propertyKey}:`, error);

        if (rethrow) {
          throw appError;
        }

        return null;
      }
    };

    return descriptor;
  };
}

/**
 * 重试机制
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      const waitTime = backoff ? delay * attempt : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new AppError(
    ErrorCode.UNKNOWN_ERROR,
    '操作失败，已达到最大重试次数'
  );
}

/**
 * 开发环境日志工具
 * 仅在开发环境输出日志，生产环境静默
 */
export const devLog = {
  error: (message: string, ...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.error(message, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.warn(message, ...args);
    }
  },
  info: (message: string, ...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.info(message, ...args);
    }
  },
  log: (message: string, ...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.log(message, ...args);
    }
  },
};

/**
 * 表单验证错误处理
 */
export class ValidationErrors {
  private errors: Map<string, string[]> = new Map();

  add(field: string, message: string): void {
    const messages = this.errors.get(field) || [];
    messages.push(message);
    this.errors.set(field, messages);
  }

  has(field: string): boolean {
    return this.errors.has(field);
  }

  get(field: string): string[] {
    return this.errors.get(field) || [];
  }

  getFirst(field: string): string | null {
    const messages = this.get(field);
    return messages.length > 0 ? messages[0] : null;
  }

  clear(field?: string): void {
    if (field) {
      this.errors.delete(field);
    } else {
      this.errors.clear();
    }
  }

  isEmpty(): boolean {
    return this.errors.size === 0;
  }

  toObject(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    this.errors.forEach((messages, field) => {
      result[field] = messages;
    });
    return result;
  }
}