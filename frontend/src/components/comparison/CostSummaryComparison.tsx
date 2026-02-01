/**
 * 费用汇总对比表格组件
 */
import React from 'react';
import { Table, Typography, Tag } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS, getValueColor } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';
import {
  STORAGE_STRATEGY_NAMES,
  STORAGE_STRATEGY_COLORS,
} from '../../constants/storageStrategies';

const { Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

interface RowData {
  key: string;
  label: string;
  isNumeric: boolean;
  isCost: boolean;
  values: (string | number)[];
}

const CostSummaryComparison: React.FC<Props> = ({ records }) => {
  // 定义对比行
  const rows: RowData[] = [
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

  // 动态列
  const columns = [
    {
      title: '对比项',
      dataIndex: 'label',
      key: 'label',
      width: 160,
      fixed: 'left' as const,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: RECORD_COLORS[idx],
            display: 'inline-block',
            marginRight: 8,
          }} />
          {record.name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'right' as const,
      render: (_: unknown, row: RowData) => {
        const value = row.values[idx];

        // 存储策略特殊处理
        if (row.key === 'strategy') {
          const strategy = value as string;
          return (
            <Tag color={STORAGE_STRATEGY_COLORS[strategy]}>
              {STORAGE_STRATEGY_NAMES[strategy] || strategy}
            </Tag>
          );
        }

        // 非数值直接显示
        if (!row.isNumeric) {
          return <Text>{value}</Text>;
        }

        // 数值类型：计算颜色
        const numValue = value as number;
        const allNumValues = row.values as number[];
        const color = row.isCost ? getValueColor(numValue, allNumValues, true) : undefined;

        return (
          <Text style={{ color }} strong={!!color}>
            ${formatNumber(numValue, 4)}
          </Text>
        );
      },
    })),
  ];

  // 构建表格数据
  const dataSource = rows.map((row) => ({
    ...row,
    ...records.reduce((acc, _, idx) => ({
      ...acc,
      [`value_${idx}`]: row.values[idx],
    }), {}),
  }));

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      bordered
      scroll={{ x: 'max-content' }}
    />
  );
};

export default CostSummaryComparison;
