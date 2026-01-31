/**
 * 前后端共享的类型定义
 * 确保类型一致性，减少重复定义
 */

/**
 * 基础响应类型
 */
export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta?: ResponseMeta;
}

/**
 * 错误响应类型
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * 响应元数据
 */
export interface ResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  timestamp?: string;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * 时间范围参数
 */
export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

/**
 * 数值范围类型
 */
export interface NumberRange {
  min: number;
  max: number;
}

/**
 * 选项类型（用于下拉框等）
 */
export interface Option<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  children?: Option<T>[];
}

/**
 * 树形结构节点
 */
export interface TreeNode<T = any> {
  id: string;
  name: string;
  data?: T;
  children?: TreeNode<T>[];
  parent?: string;
}

/**
 * 键值对类型
 */
export interface KeyValue<V = any> {
  key: string;
  value: V;
}

/**
 * 状态类型
 */
export enum Status {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * 操作类型
 */
export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

/**
 * 排序方向
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 通用的 CRUD 操作接口
 */
export interface CrudOperations<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  create(data: CreateDTO): Promise<T>;
  read(id: string): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
  list(params?: PaginationParams): Promise<T[]>;
}

/**
 * 审计信息
 */
export interface AuditInfo {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
}

/**
 * 带审计信息的实体基类
 */
export interface BaseEntity extends AuditInfo {
  id: string;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult<T = any> {
  success: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
  total: number;
  successCount: number;
  failedCount: number;
}

/**
 * 文件信息
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url?: string;
  path?: string;
  lastModified?: number;
}

/**
 * 导出配置
 */
export interface ExportConfig {
  format: 'excel' | 'csv' | 'pdf' | 'json';
  columns?: string[];
  filters?: Record<string, any>;
  fileName?: string;
}

/**
 * 统计数据项
 */
export interface StatItem {
  label: string;
  value: number;
  unit?: string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'stable';
}

/**
 * 图表数据点
 */
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
}

/**
 * 图表系列
 */
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'scatter';
}

/**
 * 验证规则
 */
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

/**
 * 表单字段配置
 */
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'radio';
  placeholder?: string;
  defaultValue?: any;
  options?: Option[];
  rules?: ValidationRule[];
  disabled?: boolean;
  hidden?: boolean;
  tooltip?: string;
}