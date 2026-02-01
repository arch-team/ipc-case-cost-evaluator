/**
 * 公共样式常量
 * 提取自各组件的重复样式定义
 */
import type { CSSProperties } from 'react';

/**
 * 认证相关样式
 */
export const authStyles = {
  /**
   * 登录按钮样式 - 蓝色渐变
   */
  loginButton: {
    height: 44,
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.35)',
  } as CSSProperties,

  /**
   * 注册按钮样式 - 绿色渐变
   */
  registerButton: {
    height: 44,
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(82, 196, 26, 0.35)',
  } as CSSProperties,

  /**
   * 输入框样式
   */
  input: {
    borderRadius: 8,
    height: 44,
  } as CSSProperties,

  /**
   * 表单标签样式
   */
  formLabel: {
    fontWeight: 500,
  } as CSSProperties,

  /**
   * 图标前缀样式
   */
  iconPrefix: {
    color: '#bfbfbf',
  } as CSSProperties,

  /**
   * 提示框样式
   */
  alert: {
    marginBottom: 16,
    borderRadius: 8,
  } as CSSProperties,
};

/**
 * 按钮样式工厂函数
 * 创建带渐变的按钮样式
 */
export function createGradientButtonStyle(
  startColor: string,
  endColor: string,
  shadowColor: string,
  shadowOpacity: number = 0.35
): CSSProperties {
  return {
    height: 44,
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
    background: `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`,
    border: 'none',
    boxShadow: `0 4px 12px ${shadowColor.replace('rgb', 'rgba').replace(')', `, ${shadowOpacity})`)}`,
  };
}