/**
 * API 客户端
 */
import axios from 'axios';
import type {
  CostCalculationInput,
  CostSummary,
  ComparisonResult,
  ComparisonItem,
  Scenario,
  RegionPricing,
  Evaluation,
  ShareCreate,
  ShareResponse,
  SharedEvaluation,
  ScenarioCategory,
  FunctionalDimensions,
  PricingDimensions,
  TechnicalScheme,
  BatchCalculationResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<number | string, string> = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '没有访问权限',
  404: '资源不存在',
  422: '参数验证失败',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂时不可用',
  504: '网关超时',
  default: '网络请求失败，请稍后重试',
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

// 响应拦截器 - 增强错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 处理网络错误（无响应）
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = '请求超时，请检查网络连接';
      } else {
        error.message = '网络连接失败，请检查网络';
      }
      return Promise.reject(error);
    }

    const status = error.response?.status;

    // 处理 401 未授权
    if (status === 401) {
      localStorage.removeItem('token');
    }

    // 设置友好的错误消息
    const serverMessage = error.response?.data?.detail;
    error.message = serverMessage || ERROR_MESSAGES[status] || ERROR_MESSAGES.default;

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

  // 批量计算多个方案（前端聚合）
  batchCalculate: async (
    functional: FunctionalDimensions,
    pricing: PricingDimensions,
    schemes: TechnicalScheme[]
  ): Promise<{ results: BatchCalculationResult[]; comparison: ComparisonResult }> => {
    // 只计算启用的方案
    const enabledSchemes = schemes.filter((s) => s.enabled);

    if (enabledSchemes.length === 0) {
      return {
        results: [],
        comparison: { baseline: '', items: [] },
      };
    }

    // 并行调用 calculate API（支持方案级 retention_days 覆盖）
    const calculatePromises = enabledSchemes.map((scheme) => {
      // 如果方案有自定义 retention_days，则覆盖默认值
      const schemeFunction = scheme.retention_days
        ? { ...functional, retention_days: scheme.retention_days }
        : functional;
      return apiClient.post<CostSummary>('/calculate', {
        functional: schemeFunction,
        technical: scheme.technical,
        pricing,
      });
    });

    const responses = await Promise.all(calculatePromises);

    // 构建批量计算结果
    const results: BatchCalculationResult[] = responses.map((response, index) => ({
      schemeId: enabledSchemes[index].id,
      schemeName: enabledSchemes[index].name,
      result: response.data,
      technical: enabledSchemes[index].technical,
      retention_days: enabledSchemes[index].retention_days ?? functional.retention_days,
    }));

    // 找出成本最低的方案
    const minCostResult = results.reduce(
      (min, curr) => (curr.result.monthly_total < min.result.monthly_total ? curr : min),
      results[0]
    );

    // 第一个方案作为基准
    const baselineResult = results[0];
    const baselineCost = baselineResult.result.monthly_total;

    // 构建对比项
    const items: ComparisonItem[] = results.map((r, index) => {
      const isBaseline = index === 0;
      const isRecommended = r.schemeId === minCostResult.schemeId;
      const vsBaseline = isBaseline
        ? 0
        : (r.result.monthly_total - baselineCost) / baselineCost;

      // 获取存储类型显示名称
      const storageClass = r.technical.lifecycle_policy?.enabled
        ? 'Lifecycle Policy'
        : r.technical.storage_class === 'STANDARD'
        ? 'S3 Standard'
        : r.technical.storage_class === 'GLACIER_IR'
        ? 'S3 Glacier IR'
        : r.technical.storage_class;

      return {
        name: r.schemeName,
        storage_class: storageClass,
        monthly_cost: r.result.monthly_total,
        yearly_cost: r.result.yearly_total,
        vs_baseline: vsBaseline,
        breakdown: r.result.breakdown,
        is_recommended: isRecommended,
        technical: r.technical,
        metrics: r.result.metrics,
      };
    });

    // 构建推荐信息
    const recommendation = minCostResult.schemeId !== baselineResult.schemeId
      ? {
          recommended_option: minCostResult.schemeName,
          reason: `${minCostResult.schemeName} 相比基准方案可节省 ${(
            ((baselineCost - minCostResult.result.monthly_total) / baselineCost) *
            100
          ).toFixed(1)}% 的成本`,
          potential_savings: baselineCost - minCostResult.result.monthly_total,
        }
      : undefined;

    return {
      results,
      comparison: {
        baseline: baselineResult.schemeName,
        items,
        recommendation,
      },
    };
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
  list: async (params?: {
    search?: string;
    sort_by?: 'created_at' | 'updated_at' | 'name';
    sort_order?: 'asc' | 'desc';
  }): Promise<Evaluation[]> => {
    const response = await apiClient.get<{ evaluations: Evaluation[] }>('/evaluations', {
      params,
    });
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

  // 复制评估记录
  duplicate: async (id: string, name?: string): Promise<Evaluation> => {
    const response = await apiClient.post<Evaluation>(`/evaluations/${id}/duplicate`, {
      name,
    });
    return response.data;
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
import type { TokenResponse, User, UserUpdateRequest } from '../types/auth';

export const authApi = {
  // 登录
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // 注册
  register: async (email: string, password: string, name: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  },

  // 获取当前用户
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  // 更新当前用户信息
  updateUser: async (data: UserUpdateRequest): Promise<User> => {
    const response = await apiClient.put<User>('/auth/update', data);
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
