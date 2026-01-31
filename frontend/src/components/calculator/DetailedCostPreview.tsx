/**
 * 详细成本预览组件
 *
 * 在输入表单下方内联展示详细核算信息，包括：
 * 1. 中间计算指标（分两组）
 * 2. 分阶段费用表格
 * 3. 费用汇总（含饼图）
 *
 * 支持加载状态和错误处理
 */
import React, { useState, useMemo } from 'react';
import {
  Card,
  Typography,
  Spin,
  Alert,
  Collapse,
  Tag,
} from 'antd';
import {
  DollarOutlined,
  PieChartOutlined,
  LoadingOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import type { DetailedCalculationResult } from '../../types/calculationRecords';
import type { CostCalculationInput } from '../../types';
import { formatNumber } from '../../utils/formatters';
import IntermediateMetrics from './IntermediateMetrics';
import MetricSummary from './MetricSummary';
import StageCostTable from './StageCostTable';
import CostPieChart from './CostPieChart';
import { MiniDonutChart } from '../charts';
import type { DonutDataItem } from '../charts';
import {
  STORAGE_STRATEGY_LABELS,
  STORAGE_STRATEGY_COLORS,
} from '../../constants/storageStrategies';

const { Text } = Typography;

interface DetailedCostPreviewProps {
  result: DetailedCalculationResult | null;
  loading: boolean;
  error: string | null;
  previousResult?: DetailedCalculationResult | null; // 上次成功的结果（加载时显示）
  input?: CostCalculationInput; // 输入参数（用于显示计算公式）
}

// 存储策略显示名称（从统一数据源获取）
const storageStrategyNames = STORAGE_STRATEGY_LABELS;

// 存储策略标签颜色（从统一数据源获取）
const storageStrategyColors = STORAGE_STRATEGY_COLORS;

const DetailedCostPreview: React.FC<DetailedCostPreviewProps> = ({
  result,
  loading,
  error,
  previousResult,
  input,
}) => {
  // 使用当前结果或上次结果
  const displayResult = result || previousResult;

  // 控制费用占比饼图的展开状态
  const [chartActiveKey, setChartActiveKey] = useState<string[]>(['chart']);

  // 将费用汇总转换为 CostPieChart 需要的格式
  const getBreakdownForChart = () => {
    if (!displayResult) return null;
    const summary = displayResult.summary;
    return {
      storage_cost: summary.storage_cost,
      put_request_cost: summary.put_request_cost,
      get_request_cost: summary.get_request_cost,
      retrieval_cost: summary.retrieval_cost,
      data_transfer_cost: summary.data_transfer_cost,
      lifecycle_cost: summary.lifecycle_cost,
      total: summary.total_cost,
    };
  };

  // 将费用汇总转换为迷你环图需要的格式
  const getDonutData = useMemo((): DonutDataItem[] => {
    if (!displayResult) return [];
    const summary = displayResult.summary;
    return [
      { name: '存储费用', value: summary.storage_cost },
      { name: 'PUT 请求', value: summary.put_request_cost },
      { name: 'GET 请求', value: summary.get_request_cost },
      { name: '检索费用', value: summary.retrieval_cost },
      { name: '传输费用', value: summary.data_transfer_cost },
      { name: '生命周期转换', value: summary.lifecycle_cost },
    ].filter(item => item.value > 0);
  }, [displayResult]);

  // 点击迷你环图时展开费用占比面板
  const handleDonutClick = () => {
    if (!chartActiveKey.includes('chart')) {
      setChartActiveKey(['chart']);
    }
    // 滚动到饼图区域
    setTimeout(() => {
      const chartElement = document.querySelector('.cost-pie-chart-panel');
      chartElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // 空状态
  if (!displayResult && !loading && !error) {
    return (
      <Card className="detailed-cost-preview">
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <CalculatorOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
          <div>修改参数后将自动计算详细核算信息</div>
        </div>
      </Card>
    );
  }

  // 错误状态
  if (error && !displayResult) {
    return (
      <Card className="detailed-cost-preview">
        <Alert
          message="计算失败"
          description={error}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  const breakdown = getBreakdownForChart();

  return (
    <Card
      className="detailed-cost-preview"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DollarOutlined />
          <span>详细核算信息</span>
          {displayResult && (
            <Tag color={storageStrategyColors[displayResult.storage_strategy]}>
              {storageStrategyNames[displayResult.storage_strategy]}
            </Tag>
          )}
          {loading && (
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />}
              size="small"
            />
          )}
        </div>
      }
      style={loading && !result ? { opacity: 0.7 } : undefined}
    >
      {/* 错误提示（有上次结果时显示在顶部） */}
      {error && displayResult && (
        <Alert
          message={error}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {displayResult && (
        <>
          {/* 费用汇总 Hero - 双栏布局 */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 8,
            padding: '24px',
            marginBottom: 24,
            color: '#fff',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}>
              {/* 左栏: 成本数据 */}
              <div style={{ flex: '1 1 auto', minWidth: 200 }}>
                {/* 月度总成本 */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
                    月度总成本
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.1 }}>
                    ${formatNumber(displayResult.summary.total_cost, 4)}
                  </div>
                </div>
                {/* 单位成本 */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>单设备成本</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      ${formatNumber(displayResult.summary.cost_per_device, 4)}/设备
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>单 GB 成本</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      ${formatNumber(displayResult.summary.cost_per_gb, 4)}/GB
                    </div>
                  </div>
                </div>
              </div>

              {/* 右栏: 迷你环图 */}
              <div style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MiniDonutChart
                  data={getDonutData}
                  size={120}
                  onClick={handleDonutClick}
                />
              </div>
            </div>
          </div>

          {/* 关键指标摘要 + 渐进式披露 */}
          <div style={{ marginBottom: 24 }}>
            {/* 摘要区 - 固定显示 4 个关键指标 */}
            <MetricSummary metrics={displayResult.intermediate_metrics} />

            {/* 完整计算过程 - 默认折叠 */}
            <Collapse
              defaultActiveKey={[]}
              items={[
                {
                  key: 'metrics',
                  label: (
                    <span>
                      <CalculatorOutlined style={{ marginRight: 8 }} />
                      查看完整计算过程
                    </span>
                  ),
                  children: (
                    <IntermediateMetrics
                      metrics={displayResult.intermediate_metrics}
                      input={input}
                    />
                  ),
                },
              ]}
              style={{ marginTop: 12 }}
            />
          </div>

          {/* 分阶段费用明细 */}
          <Collapse
            defaultActiveKey={['stages']}
            items={[
              {
                key: 'stages',
                label: (
                  <span>
                    <DollarOutlined style={{ marginRight: 8 }} />
                    分阶段费用明细
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      （点击卡片展开查看计算公式）
                    </Text>
                  </span>
                ),
                children: (
                  <StageCostTable
                    stages={displayResult.stage_details}
                    dataTransferCost={displayResult.summary.data_transfer_cost}
                    dataTransferTiers={displayResult.data_transfer_tiers}
                    totalCostWithTransfer={displayResult.summary.total_cost}
                  />
                ),
              },
            ]}
            style={{ marginBottom: 24 }}
          />

          {/* 费用占比饼图 - 默认展开，支持从 Hero 环图点击控制 */}
          {breakdown && (
            <Collapse
              className="cost-pie-chart-panel"
              activeKey={chartActiveKey}
              onChange={(keys) => setChartActiveKey(keys as string[])}
              items={[
                {
                  key: 'chart',
                  label: (
                    <span>
                      <PieChartOutlined style={{ marginRight: 8 }} />
                      费用占比分析
                    </span>
                  ),
                  children: (
                    <div style={{ height: 300 }}>
                      <CostPieChart breakdown={breakdown} />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}
    </Card>
  );
};

export default DetailedCostPreview;
