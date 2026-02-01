/**
 * 认证上下文
 *
 * 提供全局认证状态和用户角色管理。
 */
import React, { createContext, useState, useCallback, useMemo } from 'react';
import type { User, UserRole, TokenResponse } from '../types/auth';
import { ROLE_LEVELS } from '../types/auth';

export interface AuthContextType {
  /** 当前用户信息 */
  user: User | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 是否正在加载认证状态 */
  isLoading: boolean;
  /** 是否为管理员 */
  isAdmin: boolean;
  /** 是否为普通用户（含管理员） */
  isUser: boolean;
  /** 是否为访客（未登录或 viewer 角色） */
  isViewer: boolean;
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

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * 从 localStorage 恢复用户状态的初始化函数
 */
const getInitialUser = (): User | null => {
  try {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      return JSON.parse(storedUser) as User;
    }
  } catch {
    // 存储的数据无效，清除
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  return null;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 使用惰性初始化避免 useEffect 中的 setState
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [isLoading] = useState(false);

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

  // 计算便捷角色属性
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isUserRole = useMemo(() => !!user && ROLE_LEVELS[user.role] >= ROLE_LEVELS['user'], [user]);
  const isViewer = useMemo(() => !user || user.role === 'viewer', [user]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      isAdmin,
      isUser: isUserRole,
      isViewer,
      login,
      logout,
      updateUser,
      hasRole,
      isRole,
    }),
    [user, isLoading, isAdmin, isUserRole, isViewer, login, logout, updateUser, hasRole, isRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
