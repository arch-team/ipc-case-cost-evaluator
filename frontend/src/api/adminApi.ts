/**
 * 管理员 API
 */
import apiClient from './client';
import type {
  User,
  UserRole,
  UserStatus,
  UserListResponse,
  AdminUserUpdateRequest,
  SystemStats,
} from '../types/auth';

export const adminApi = {
  // 获取用户列表
  listUsers: async (params?: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  }): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/admin/users', { params });
    return response.data;
  },

  // 获取用户详情
  getUser: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/users/${userId}`);
    return response.data;
  },

  // 更新用户角色或状态
  updateUser: async (userId: string, data: AdminUserUpdateRequest): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${userId}`, data);
    return response.data;
  },

  // 解锁用户
  unlockUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/admin/users/${userId}/unlock`);
    return response.data;
  },

  // 获取系统统计
  getStats: async (): Promise<SystemStats> => {
    const response = await apiClient.get<SystemStats>('/admin/stats');
    return response.data;
  },
};

export default adminApi;
