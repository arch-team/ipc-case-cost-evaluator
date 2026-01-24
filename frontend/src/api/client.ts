/**
 * API 客户端
 */
import axios from 'axios';
import type {
  CostCalculationInput,
  CostSummary,
  ComparisonResult,
  Scenario,
  RegionPricing,
  Evaluation,
  ShareCreate,
  ShareResponse,
  SharedEvaluation,
  ScenarioCategory,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证令牌
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除无效令牌，但不自动跳转
      // 让各组件自行处理 401 错误
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

/**
 * 计算 API
 */
export const calculatorApi = {
  // 计算成本
  calculate: async (input: CostCalculationInput): Promise<CostSummary> => {
    const response = await apiClient.post<CostSummary>('/calculate', input);
    return response.data;
  },

  // 对比方案
  compare: async (input: CostCalculationInput): Promise<ComparisonResult> => {
    const response = await apiClient.post<ComparisonResult>('/compare', input);
    return response.data;
  },
};

/**
 * 场景 API
 */
export const scenarioApi = {
  // 获取预设场景列表
  getScenarios: async (): Promise<Scenario[]> => {
    const response = await apiClient.get<{ scenarios: Scenario[] }>('/scenarios');
    return response.data.scenarios;
  },

  // 获取场景列表和分类
  list: async (): Promise<{ scenarios: Scenario[]; categories: ScenarioCategory[] }> => {
    const response = await apiClient.get<{ scenarios: Scenario[]; categories: ScenarioCategory[] }>('/scenarios');
    return response.data;
  },

  // 获取单个场景
  get: async (id: string): Promise<Scenario> => {
    const response = await apiClient.get<Scenario>(`/scenarios/${id}`);
    return response.data;
  },
};

/**
 * 定价 API
 */
export const pricingApi = {
  // 获取区域列表
  getRegions: async (): Promise<string[]> => {
    const response = await apiClient.get<{ regions: string[] }>('/pricing/regions');
    return response.data.regions;
  },

  // 获取区域定价
  getRegionPricing: async (region: string): Promise<RegionPricing> => {
    const response = await apiClient.get<RegionPricing>(`/pricing/${region}`);
    return response.data;
  },
};

/**
 * 评估记录 API
 */
export const evaluationApi = {
  // 创建评估记录
  create: async (data: {
    name: string;
    description?: string;
    input_data: CostCalculationInput;
    result: CostSummary;
  }): Promise<Evaluation> => {
    const response = await apiClient.post<Evaluation>('/evaluations', data);
    return response.data;
  },

  // 获取评估记录列表
  list: async (): Promise<Evaluation[]> => {
    const response = await apiClient.get<{ evaluations: Evaluation[] }>('/evaluations');
    return response.data.evaluations;
  },

  // 获取单个评估记录
  get: async (id: string): Promise<Evaluation> => {
    const response = await apiClient.get<Evaluation>(`/evaluations/${id}`);
    return response.data;
  },

  // 更新评估记录
  update: async (
    id: string,
    data: { name?: string; description?: string }
  ): Promise<Evaluation> => {
    const response = await apiClient.put<Evaluation>(`/evaluations/${id}`, data);
    return response.data;
  },

  // 删除评估记录
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/evaluations/${id}`);
  },
};

/**
 * 导出 API
 */
export const exportApi = {
  // 导出 Excel
  exportExcel: async (data: {
    input_data: CostCalculationInput;
    result: CostSummary;
    comparison?: ComparisonResult;
    title?: string;
  }): Promise<Blob> => {
    const response = await apiClient.post('/export', data, {
      responseType: 'blob',
    });
    return response.data;
  },
};

/**
 * 认证 API
 */
export const authApi = {
  // 登录
  login: async (email: string, password: string): Promise<{ access_token: string }> => {
    const response = await apiClient.post<{ access_token: string }>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // 注册
  register: async (
    email: string,
    password: string,
    name: string
  ): Promise<{ id: string; email: string; name: string }> => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  },

  // 获取当前用户
  getCurrentUser: async (): Promise<{ id: string; email: string; name: string }> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

/**
 * 分享 API
 */
export const shareApi = {
  // 创建分享链接
  create: async (evaluationId: string, data: ShareCreate = {}): Promise<ShareResponse> => {
    const response = await apiClient.post<ShareResponse>(
      `/evaluations/${evaluationId}/share`,
      data
    );
    return response.data;
  },

  // 获取分享的评估内容 (公开接口)
  get: async (token: string): Promise<SharedEvaluation> => {
    const response = await apiClient.get<SharedEvaluation>(`/shared/${token}`);
    return response.data;
  },

  // 删除分享链接
  delete: async (evaluationId: string, token: string): Promise<void> => {
    await apiClient.delete(`/evaluations/${evaluationId}/share/${token}`);
  },

  // 列出评估的所有分享链接
  list: async (evaluationId: string): Promise<{ shares: ShareResponse[] }> => {
    const response = await apiClient.get<{ shares: ShareResponse[] }>(
      `/evaluations/${evaluationId}/shares`
    );
    return response.data;
  },
};

export default apiClient;
