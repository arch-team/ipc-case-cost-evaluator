/**
 * 结果展示组件 - 决策摘要区域
 * 重构版本：蓝色渐变 Hero 卡片 + 关键指标栏 + 计算过程折叠 + 费用明细
 */
import React from 'react';
import { Button, Typography } from 'antd';
import { DownloadOutlined, DollarOutlined } from '@ant-design/icons';
import type { CostSummary, TechnicalDimensions, CostCalculationInput } from '../../types';
import type { IntermediateMetricsDetail } from '../../types/calculationRecords';
import CostHeroCard from './CostHeroCard';
import MetricSummaryBar from './MetricSummaryBar';
import CalculationDetailsCollapse from './CalculationDetailsCollapse';
import BreakdownContent from './BreakdownContent';

const { Title } = Typography;

// 方案信息
interface SchemeInfo {
  id: string;
  name: string;
  technical: TechnicalDimensions;
}

interface ResultDisplayProps {
  result: CostSummary;
  schemeInfo?: SchemeInfo;
  isRecommended?: boolean;
  region?: string;
  retentionDays?: number;
  accessPattern?: number;
  input?: CostCalculationInput;
  intermediateMetrics?: IntermediateMetricsDetail;
  onExport?: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  schemeInfo,
  isRecommended = false,
  region = 'us-east-1',
  retentionDays,
  accessPattern,
  input,
  intermediateMetrics,
  onExport,
}) => {
  // 计算每日录制秒数
  const dailyRecordingSeconds = React.useMemo(() => {
    if (!input?.functional) return 0;
    const { recording_mode, events_per_day, event_duration_sec, scheduled_hours } = input.functional;
    if (recording_mode === 'continuous') {
      return 86400; // 24小时全天录制
    }
    if (recording_mode === 'scheduled') {
      return (scheduled_hours || 8) * 3600; // 定时段录制
    }
    // event_triggered 模式
    return (events_per_day || 0) * (event_duration_sec || 0);
  }, [input?.functional]);

  // 计算每日分片数
  const segmentsPerDay = React.useMemo(() => {
    if (!input?.functional || !result.metrics?.daily_data_gb) return 0;
    const { segment_strategy, segment_value } = input.functional;
    const dailyDataKb = result.metrics.daily_data_gb * 1024 * 1024;

    if (segment_strategy === 'fixed_size') {
      // 按大小分片：日数据量 / 分片大小
      const segmentSizeKb = segment_value || 5120; // 默认 5MB
      return Math.ceil(dailyDataKb / segmentSizeKb);
    }
    // fixed_duration 或默认：按时间分片
    const segmentSeconds = segment_value || 60; // 默认 60 秒
    return Math.ceil(dailyRecordingSeconds / segmentSeconds);
  }, [input?.functional, result.metrics?.daily_data_gb, dailyRecordingSeconds]);

  // 从 result.metrics 构造 IntermediateMetricsDetail（如果未提供 intermediateMetrics）
  const metricsDetail: IntermediateMetricsDetail | null = React.useMemo(() => {
    if (intermediateMetrics) return intermediateMetrics;
    if (!result.metrics) return null;

    // 基于 UsageMetrics 构造基础的 IntermediateMetricsDetail
    const m = result.metrics;
    return {
      daily_recording_seconds: dailyRecordingSeconds,
      daily_data_kb: m.daily_data_gb * 1024 * 1024,
      daily_data_gb: m.daily_data_gb,
      monthly_data_gb: m.daily_data_gb * 30,
      avg_storage_gb: m.avg_storage_gb,
      avg_storage_tb: m.avg_storage_gb / 1024,
      segments_per_day: segmentsPerDay,
      monthly_puts: m.monthly_puts,
      monthly_gets: m.monthly_gets,
      monthly_retrieval_gb: m.monthly_retrieval_gb,
      monthly_transfer_gb: m.monthly_transfer_gb,
    };
  }, [intermediateMetrics, result.metrics, dailyRecordingSeconds, segmentsPerDay]);

  return (
    <div>
      {/* 页面标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <DollarOutlined style={{ marginRight: 8 }} />
          成本计算结果
        </Title>
        {onExport && (
          <Button type="primary" icon={<DownloadOutlined />} onClick={onExport}>
            导出 Excel
          </Button>
        )}
      </div>

      {/* Hero 区域 - 蓝色渐变卡片 */}
      <CostHeroCard
        result={result}
        breakdown={result.breakdown}
        schemeInfo={schemeInfo}
        isRecommended={isRecommended}
      />

      {/* 关键指标栏 */}
      {result.metrics && (
        <MetricSummaryBar metrics={result.metrics} />
      )}

      {/* 计算过程折叠面板 */}
      {metricsDetail && (
        <CalculationDetailsCollapse
          metrics={metricsDetail}
          input={input}
        />
      )}

      {/* 费用明细区域（可折叠） */}
      <div style={{ marginTop: 24 }}>
        <BreakdownContent
          result={result}
          schemeInfo={schemeInfo}
          region={region}
          retentionDays={retentionDays}
          accessPattern={accessPattern}
        />
      </div>
    </div>
  );
};

export default ResultDisplay;
