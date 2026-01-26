/**
 * 认证上下文
 *
 * 提供全局认证状态和用户角色管理。
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User, UserRole, TokenResponse } from '../types/auth';
import { ROLE_LEVELS } from '../types/auth';

interface AuthContextType {
  /** 当前用户信息 */
  user: User | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 是否正在加载认证状态 */
  isLoading: boolean;
  /** 登录 */
  login: (tokenResponse: TokenResponse) => void;
  /** 登出 */
  logout: () => void;
  /** 更新用户信息 */
  updateUser: (user: User) => void;
  /** 检查是否有指定角色或更高权限 */
  hasRole: (minRole: UserRole) => boolean;
  /** 检查是否是指定角色 */
  isRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 恢复认证状态
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch (error) {
        // 存储的数据无效，清除
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback((tokenResponse: TokenResponse) => {
    localStorage.setItem(TOKEN_KEY, tokenResponse.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(tokenResponse.user));
    setUser(tokenResponse.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((newUser: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const hasRole = useCallback(
    (minRole: UserRole): boolean => {
      if (!user) return false;
      return ROLE_LEVELS[user.role] >= ROLE_LEVELS[minRole];
    },
    [user]
  );

  const isRole = useCallback(
    (role: UserRole): boolean => {
      if (!user) return false;
      return user.role === role;
    },
    [user]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateUser,
      hasRole,
      isRole,
    }),
    [user, isLoading, login, logout, updateUser, hasRole, isRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 使用认证上下文的 Hook
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
