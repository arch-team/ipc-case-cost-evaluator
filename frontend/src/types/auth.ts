/**
 * 认证相关类型定义
 */

// 用户角色
export type UserRole = 'viewer' | 'user' | 'admin';

// 用户状态
export type UserStatus = 'active' | 'disabled';

// 用户信息
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// 用户更新请求
export interface UserUpdateRequest {
  name?: string;
  password?: string;
}

// Token 响应
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// 管理员用户更新请求
export interface AdminUserUpdateRequest {
  role?: UserRole;
  status?: UserStatus;
}

// 用户列表响应
export interface UserListResponse {
  users: User[];
  total: number;
}

// 系统统计
export interface SystemStats {
  total_users: number;
  active_users: number;
  disabled_users: number;
  admin_count: number;
  total_evaluations: number;
  total_shares: number;
}

// 角色权限等级映射
export const ROLE_LEVELS: Record<UserRole, number> = {
  viewer: 0,
  user: 1,
  admin: 2,
};

// 角色显示名称
export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: '访客',
  user: '用户',
  admin: '管理员',
};

// 状态显示名称
export const STATUS_LABELS: Record<UserStatus, string> = {
  active: '正常',
  disabled: '已禁用',
};
