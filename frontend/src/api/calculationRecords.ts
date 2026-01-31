/**
 * 核算记录 API 客户端
 */
import apiClient from './client';
import type {
  CalculationRecord,
  CalculationRecordListResponse,
  CreateCalculationRecordRequest,
  DetailedCalculationResult,
  RecordCountResponse,
} from '../types/calculationRecords';
import type { CostCalculationInput } from '../types';

/**
 * 核算记录 API
 */
export const calculationRecordApi = {
  /**
   * 获取默认输入参数
   */
  getDefaults: async (): Promise<CostCalculationInput> => {
    const response = await apiClient.get<CostCalculationInput>('/defaults');
    return response.data;
  },

  /**
   * 实时计算详细成本（无需登录）
   */
  calculateDetailed: async (
    input: CostCalculationInput
  ): Promise<DetailedCalculationResult> => {
    const response = await apiClient.post<DetailedCalculationResult>(
      '/calculate-detailed',
      input
    );
    return response.data;
  },

  /**
   * 获取核算记录列表
   */
  list: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    sort_by?: 'created_at' | 'name' | 'total_cost';
    sort_order?: 'asc' | 'desc';
  }): Promise<CalculationRecordListResponse> => {
    const response = await apiClient.get<CalculationRecordListResponse>(
      '/calculation-records',
      { params }
    );
    return response.data;
  },

  /**
   * 创建核算记录
   */
  create: async (
    request: CreateCalculationRecordRequest,
    input: CostCalculationInput
  ): Promise<CalculationRecord> => {
    const response = await apiClient.post<CalculationRecord>(
      '/calculation-records',
      { ...request, ...input }
    );
    return response.data;
  },

  /**
   * 获取核算记录详情
   */
  get: async (recordId: string): Promise<CalculationRecord> => {
    const response = await apiClient.get<CalculationRecord>(
      `/calculation-records/${encodeURIComponent(recordId)}`
    );
    return response.data;
  },

  /**
   * 删除核算记录
   */
  delete: async (recordId: string): Promise<void> => {
    await apiClient.delete(`/calculation-records/${encodeURIComponent(recordId)}`);
  },

  /**
   * 获取用户记录数量
   */
  getCount: async (): Promise<RecordCountResponse> => {
    const response = await apiClient.get<RecordCountResponse>(
      '/calculation-records/count'
    );
    return response.data;
  },
};

export default calculationRecordApi;
