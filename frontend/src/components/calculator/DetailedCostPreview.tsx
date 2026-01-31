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
import React from 'react';
import {
  Card,
  Row,
  Col,
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
import type { DetailedCalculationResult, StorageStrategy } from '../../types/calculationRecords';
import type { CostCalculationInput } from '../../types';
import { formatNumber } from '../../utils/formatters';
import IntermediateMetrics from './IntermediateMetrics';
import StageCostTable from './StageCostTable';
import CostPieChart from './CostPieChart';

const { Text } = Typography;

interface DetailedCostPreviewProps {
  result: DetailedCalculationResult | null;
  loading: boolean;
  error: string | null;
  previousResult?: DetailedCalculationResult | null; // 上次成功的结果（加载时显示）
  input?: CostCalculationInput; // 输入参数（用于显示计算公式）
}

// 存储策略显示名称
const storageStrategyNames: Record<StorageStrategy, string> = {
  single_standard: 'S3 Standard 单一存储',
  single_glacier_ir: 'Glacier IR 单一存储',
  lifecycle_std_glacier: '生命周期策略 (Standard → Glacier)',
  lifecycle_multi_stage: '多阶段生命周期策略',
};

// 存储策略标签颜色
const storageStrategyColors: Record<StorageStrategy, string> = {
  single_standard: 'blue',
  single_glacier_ir: 'cyan',
  lifecycle_std_glacier: 'purple',
  lifecycle_multi_stage: 'magenta',
};

const DetailedCostPreview: React.FC<DetailedCostPreviewProps> = ({
  result,
  loading,
  error,
  previousResult,
  input,
}) => {
  // 使用当前结果或上次结果
  const displayResult = result || previousResult;

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
          {/* 费用汇总 Hero */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 8,
            padding: '24px',
            marginBottom: 24,
            color: '#fff',
          }}>
            <Row gutter={[24, 16]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
                    月度总成本
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 600 }}>
                    ${formatNumber(displayResult.summary.total_cost, 4)}
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                    单设备成本
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>
                    ${formatNumber(displayResult.summary.cost_per_device, 4)}
                  </div>
                </div>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                    单 GB 成本
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>
                    ${formatNumber(displayResult.summary.cost_per_gb, 4)}
                  </div>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <Row gutter={8}>
                  <Col span={12}>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>存储费用</div>
                    <div style={{ fontSize: 13 }}>
                      ${formatNumber(displayResult.summary.storage_cost, 2)}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>请求费用</div>
                    <div style={{ fontSize: 13 }}>
                      ${formatNumber(
                        displayResult.summary.put_request_cost +
                        displayResult.summary.get_request_cost,
                        2
                      )}
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>

          {/* 中间计算指标 */}
          <Collapse
            defaultActiveKey={['metrics']}
            items={[
              {
                key: 'metrics',
                label: (
                  <span>
                    <CalculatorOutlined style={{ marginRight: 8 }} />
                    中间计算指标
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
            style={{ marginBottom: 24 }}
          />

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
                      （点击行展开查看计算公式）
                    </Text>
                  </span>
                ),
                children: (
                  <StageCostTable stages={displayResult.stage_details} />
                ),
              },
            ]}
            style={{ marginBottom: 24 }}
          />

          {/* 费用占比饼图 */}
          {breakdown && (
            <Collapse
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
