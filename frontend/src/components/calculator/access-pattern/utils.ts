/**
 * 访问模式相关的工具函数
 */
import type { AccessPatternStage } from '../../../types';

/**
 * 根据保留天数调整预设阶段
 */
export function getAdjustedStages(stages: AccessPatternStage[], retentionDays: number): AccessPatternStage[] {
  return stages
    .filter(stage => stage.start_day <= retentionDays)
    .map(stage => ({
      ...stage,
      end_day: Math.min(stage.end_day, retentionDays),
    }));
}

/**
 * 计算加权平均访问比例
 */
export function calculateWeightedAverage(stages: AccessPatternStage[], retentionDays: number): number {
  const adjusted = getAdjustedStages(stages, retentionDays);
  let totalDays = 0;
  let weightedSum = 0;

  for (const stage of adjusted) {
    const days = stage.end_day - stage.start_day + 1;
    weightedSum += stage.access_rate * days;
    totalDays += days;
  }

  return totalDays > 0 ? weightedSum / totalDays : 0;
}

/**
 * 格式化天数显示
 */
export function formatDays(start: number, end: number): string {
  if (start === end) return `${start}天`;
  return `${start}-${end}天`;
}