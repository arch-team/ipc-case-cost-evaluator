/**
 * 定价数据 Hook
 *
 * 提供统一的定价数据获取机制，从后端 API 获取实时定价。
 * 使用 React Query 进行数据缓存，避免频繁 API 调用。
 */
import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '../api';
import type { RegionPricing, StorageClass } from '../types';

/**
 * 获取指定区域的定价数据
 *
 * @param region - AWS 区域代码，如 'ap-northeast-1'
 * @returns React Query 查询结果，包含定价数据
 */
export function usePricing(region: string) {
  return useQuery<RegionPricing>({
    queryKey: ['pricing', region],
    queryFn: () => pricingApi.getRegionPricing(region),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
    gcTime: 30 * 60 * 1000, // 30 分钟后垃圾回收
    enabled: !!region, // 仅当 region 有值时才查询
  });
}

/**
 * 获取指定存储类型的定价
 *
 * @param pricing - 区域定价数据
 * @param storageClass - 存储类型
 * @returns 存储类型定价或 undefined
 */
export function getStorageClassPricing(
  pricing: RegionPricing | undefined,
  storageClass: StorageClass
) {
  return pricing?.storage_classes[storageClass];
}

/**
 * 格式化价格显示
 *
 * @param price - 价格数值
 * @param unit - 单位，如 '/GB/月'
 * @returns 格式化的价格字符串
 */
export function formatPrice(price: number, unit: string = ''): string {
  if (price === 0) return '-';
  if (price < 0.001) {
    return `$${price.toFixed(6)}${unit}`;
  }
  if (price < 0.01) {
    return `$${price.toFixed(4)}${unit}`;
  }
  return `$${price.toFixed(3)}${unit}`;
}
