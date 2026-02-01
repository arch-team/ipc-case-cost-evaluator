/**
 * 费用汇总对比表格组件
 */
import React from 'react';
import { Typography, Tag } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { getValueColor } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';
import {
  STORAGE_STRATEGY_NAMES,
  STORAGE_STRATEGY_COLORS,
} from '../../constants/storageStrategies';
import ComparisonTable, { type ComparisonRow } from './ComparisonTable';

const { Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

interface CostRow extends ComparisonRow<string | number> {
  isNumeric: boolean;
  isCost: boolean;
}

const CostSummaryComparison: React.FC<Props> = ({ records }) => {
  // 定义对比行
  const rows: CostRow[] = [
    {
      key: 'name',
      label: '记录名称',
      isNumeric: false,
      isCost: false,
      values: records.map((r) => r.name),
    },
    {
      key: 'strategy',
      label: '存储策略',
      isNumeric: false,
      isCost: false,
      values: records.map((r) => r.storage_strategy),
    },
    {
      key: 'total_cost',
      label: '月度总成本',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.total_cost),
    },
    {
      key: 'storage_cost',
      label: '存储费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.storage_cost),
    },
    {
      key: 'put_request_cost',
      label: 'PUT 请求费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.put_request_cost),
    },
    {
      key: 'get_request_cost',
      label: 'GET 请求费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.get_request_cost),
    },
    {
      key: 'retrieval_cost',
      label: '检索费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.retrieval_cost),
    },
    {
      key: 'lifecycle_cost',
      label: '生命周期转换费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.lifecycle_cost),
    },
    {
      key: 'data_transfer_cost',
      label: '数据传输费用',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.data_transfer_cost),
    },
    {
      key: 'cost_per_device',
      label: '单设备成本',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.cost_per_device),
    },
    {
      key: 'cost_per_gb',
      label: '单 GB 成本',
      isNumeric: true,
      isCost: true,
      values: records.map((r) => r.cost_summary.cost_per_gb),
    },
  ];

  // 自定义单元格渲染
  const renderCell = (value: string | number, row: ComparisonRow<string | number>) => {
    const costRow = row as CostRow;
    // 存储策略特殊处理
    if (costRow.key === 'strategy') {
      const strategy = value as string;
      return (
        <Tag color={STORAGE_STRATEGY_COLORS[strategy]}>
          {STORAGE_STRATEGY_NAMES[strategy] || strategy}
        </Tag>
      );
    }

    // 非数值直接显示
    if (!costRow.isNumeric) {
      return <Text>{value}</Text>;
    }

    // 数值类型：计算颜色
    const numValue = value as number;
    const allNumValues = costRow.values as number[];
    const color = costRow.isCost ? getValueColor(numValue, allNumValues, true) : undefined;

    return (
      <Text style={{ color }} strong={!!color}>
        ${formatNumber(numValue, 4)}
      </Text>
    );
  };

  return (
    <ComparisonTable
      dataSource={rows}
      recordNames={records.map((r) => r.name)}
      renderCell={renderCell}
    />
  );
};

export default CostSummaryComparison;
