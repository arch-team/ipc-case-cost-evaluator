/**
 * 中间计算指标展示组件
 *
 * 展示详细的中间计算过程数据，分为两组：
 * 1. 数据量指标：录像秒数、数据量(KB/GB/TB)、存储量
 * 2. 请求数指标：分片数、PUT/GET请求数、检索量、传输量
 *
 * 支持显示每个指标的计算公式，让用户理解数据来源
 */
import React from 'react';
import { Card, Row, Col, Statistic, Typography, Tooltip } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  QuestionCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { IntermediateMetricsDetail } from '../../types/calculationRecords';
import type { CostCalculationInput } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { formatLargeNumber, createFormulaGenerator } from '../../utils/calculationHelpers';

const { Text } = Typography;

interface IntermediateMetricsProps {
  metrics: IntermediateMetricsDetail;
  input?: CostCalculationInput; // 输入参数（用于生成计算公式）
  compact?: boolean; // 紧凑模式
}

const IntermediateMetrics: React.FC<IntermediateMetricsProps> = ({
  metrics,
  input,
  compact = false,
}) => {
  // 功能维度简写
  const f = input?.functional;

  // 创建公式生成器
  const formulas = createFormulaGenerator(input || {}, metrics);

  // 生成加权访问比例公式（时间衰减模式）
  const getWeightedAccessPatternFormula = (): string | null => {
    const stages = metrics.access_pattern_stages;
    if (!stages || stages.length === 0) return null;

    const parts = stages.map(s =>
      `${s.duration_days}天×${(s.access_rate * 100).toFixed(0)}%`
    );
    const totalDays = stages.reduce((sum, s) => sum + s.duration_days, 0);
    const weighted = metrics.weighted_access_pattern || 0;

    return `(${parts.join(' + ')}) ÷ ${totalDays}天 = ${(weighted * 100).toFixed(2)}%`;
  };

  // 获取录像模式说明
  const getRecordingModeDesc = (): string => {
    if (!f) return '';
    switch (f.recording_mode) {
      case 'event_triggered':
        return '事件数 × 事件时长 ÷ 3600';
      case 'continuous':
        return '全天候 24 小时';
      case 'scheduled':
        return '定时段录像小时数';
      default:
        return '';
    }
  };

  // 获取分片策略说明
  const getSegmentStrategyDesc = (): string => {
    const segmentStrategy = f?.segment_strategy || 'fixed_duration';
    switch (segmentStrategy) {
      case 'fixed_duration':
        return '录像秒数 ÷ 分片秒数';
      case 'fixed_size':
        return '数据量(KB) ÷ 分片大小(KB)';
      case 'realtime_stream':
        return '录像秒数 (每秒1次)';
      default:
        return '';
    }
  };

  // 数据量指标
  const dataMetrics = [
    {
      label: '每日录像时长',
      value: `${formatNumber(metrics.daily_recording_seconds / 3600, 2)} 小时`,
      description: getRecordingModeDesc(),
      formula: formulas.getDailyRecordingFormula(),
      icon: <ClockCircleOutlined />,
    },
    {
      label: '每日数据量',
      value: `${formatNumber(metrics.daily_data_gb, 4)} GB`,
      subValue: `${formatNumber(metrics.daily_data_kb / 1024, 2)} MB`,
      description: '设备数 × 数据速率 × 录像秒数 ÷ 1024²',
      formula: formulas.getDailyDataFormula(),
      icon: <DatabaseOutlined />,
    },
    {
      label: '月度数据量',
      value: `${formatNumber(metrics.monthly_data_gb, 2)} GB`,
      description: '每日数据量 × 30天',
      formula: formulas.getMonthlyDataFormula(),
      icon: <DatabaseOutlined />,
    },
    {
      label: '平均存储量',
      value: metrics.avg_storage_tb >= 1
        ? `${formatNumber(metrics.avg_storage_tb, 2)} TB`
        : `${formatNumber(metrics.avg_storage_gb, 2)} GB`,
      description: '每日数据量 × 保留天数',
      formula: formulas.getAvgStorageFormula(),
      icon: <DatabaseOutlined />,
    },
  ];

  // 构建请求数指标列表
  const buildRequestMetrics = () => {
    const baseMetrics = [
      {
        label: '每日分片数',
        value: formatLargeNumber(metrics.segments_per_day),
        description: getSegmentStrategyDesc(),
        formula: formulas.getSegmentsPerDayFormula(),
        icon: <CloudUploadOutlined />,
      },
      {
        label: '月度 PUT 请求',
        value: formatLargeNumber(metrics.monthly_puts),
        description: '设备数 × 每日分片数 × 30天',
        formula: formulas.getMonthlyPutsFormula(),
        icon: <CloudUploadOutlined />,
      },
    ];

    // 时间衰减模式：在 GET 请求前插入加权访问比例指标
    if (metrics.access_pattern_mode === 'time_decay' && metrics.weighted_access_pattern !== undefined) {
      baseMetrics.push({
        label: '加权访问比例',
        value: `${(metrics.weighted_access_pattern * 100).toFixed(2)}%`,
        description: '各阶段访问比例的加权平均',
        formula: getWeightedAccessPatternFormula() || '',
        icon: <StarOutlined style={{ color: '#faad14' }} />,
      });
    }

    baseMetrics.push(
      {
        label: '月度 GET 请求',
        value: formatLargeNumber(metrics.monthly_gets),
        description: metrics.access_pattern_mode === 'time_decay'
          ? '月度PUT × 加权访问比例'
          : '月度PUT × 访问比例',
        formula: formulas.getMonthlyGetsFormula(),
        icon: <DownloadOutlined />,
      },
      {
        label: '月度检索量',
        value: `${formatNumber(metrics.monthly_retrieval_gb, 2)} GB`,
        description: '每日数据量 × 30天 × 访问比例',
        formula: formulas.getMonthlyRetrievalFormula(),
        icon: <DownloadOutlined />,
      },
      {
        label: '月度传输量',
        value: `${formatNumber(metrics.monthly_transfer_gb, 2)} GB`,
        description: '等于月度检索量',
        formula: '= 月度检索量',
        icon: <DownloadOutlined />,
      },
    );

    return baseMetrics;
  };

  // 请求数指标
  const requestMetrics = buildRequestMetrics();

  // 渲染说明和公式
  const renderFormulaBlock = (description?: string, formula?: string) => {
    if (!description && (!formula || !input)) return null;
    return (
      <div style={{ marginTop: 6 }}>
        {/* 计算说明 */}
        {description && (
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              color: '#8c8c8c',
              display: 'block',
              marginBottom: 2,
            }}
          >
            {description}
          </Text>
        )}
        {/* 计算公式（带实际数值） */}
        {formula && input && (
          <Text
            style={{
              fontSize: 11,
              fontFamily: 'monospace',
              color: '#1890ff',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ color: '#bfbfbf' }}>=</span>
            {formula}
          </Text>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="intermediate-metrics-compact">
        <Row gutter={[16, 8]}>
          {[...dataMetrics, ...requestMetrics].map((metric, index) => (
            <Col key={index} xs={12} sm={8} md={6} lg={4}>
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {metric.label}
                </Text>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {metric.value}
                </div>
                {renderFormulaBlock(metric.description, metric.formula)}
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div className="intermediate-metrics">
      {/* 数据量指标 */}
      <Card
        size="small"
        title={
          <span>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            数据量指标
            {input && (
              <Tooltip title="灰色为计算说明，蓝色为实际计算公式">
                <QuestionCircleOutlined style={{ marginLeft: 8, fontSize: 12, color: '#999' }} />
              </Tooltip>
            )}
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[24, 16]}>
          {dataMetrics.map((metric, index) => (
            <Col key={index} xs={12} sm={12} md={6}>
              <Statistic
                title={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {metric.label}
                  </Text>
                }
                value={metric.value}
                valueStyle={{ fontSize: 16 }}
              />
              {metric.subValue && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  ({metric.subValue})
                </Text>
              )}
              {renderFormulaBlock(metric.description, metric.formula)}
            </Col>
          ))}
        </Row>
      </Card>

      {/* 请求数指标 */}
      <Card
        size="small"
        title={
          <span>
            <CloudUploadOutlined style={{ marginRight: 8 }} />
            请求数指标
          </span>
        }
      >
        <Row gutter={[24, 16]}>
          {requestMetrics.map((metric, index) => (
            <Col key={index} xs={12} sm={8} md={index < 3 ? 8 : 6}>
              <Statistic
                title={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {metric.label}
                  </Text>
                }
                value={metric.value}
                valueStyle={{ fontSize: 16 }}
              />
              {renderFormulaBlock(metric.description, metric.formula)}
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default IntermediateMetrics;
