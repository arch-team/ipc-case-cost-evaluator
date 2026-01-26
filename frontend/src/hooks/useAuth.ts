/**
 * 认证 Hook
 *
 * 提供对认证上下文的访问。
 */
import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';

/**
 * 使用认证上下文的 Hook
 *
 * @returns AuthContextType - 认证上下文值
 * @throws Error 如果在 AuthProvider 外部使用
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
