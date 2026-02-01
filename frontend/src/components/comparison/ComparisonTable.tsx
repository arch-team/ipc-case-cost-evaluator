/**
 * 通用对比表格组件
 *
 * 用于减少对比组件中的重复代码
 */
import React, { type ReactNode } from 'react';
import { Table, Typography } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { RECORD_COLORS } from '../../utils/comparisonHelpers';

const { Text } = Typography;

/**
 * 对比表格行数据
 */
export interface ComparisonRow<T = unknown> {
  key: string;
  label: string;
  values: T[];
  [key: string]: unknown;
}

/**
 * 对比表格属性
 */
interface ComparisonTableProps<T = unknown> {
  /** 数据源 */
  dataSource: ComparisonRow<T>[];
  /** 记录名称列表 */
  recordNames: string[];
  /** 自定义单元格渲染函数 */
  renderCell?: (value: T, row: ComparisonRow<T>, index: number) => ReactNode;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 表格大小 */
  size?: 'small' | 'middle' | 'large';
  /** 固定列配置 */
  fixedLabel?: boolean;
}

/**
 * 通用对比表格组件
 */
function ComparisonTable<T = unknown>({
  dataSource,
  recordNames,
  renderCell,
  bordered = true,
  size = 'small',
  fixedLabel = true,
}: ComparisonTableProps<T>): React.ReactElement {
  // 构建表格列
  const columns: ColumnType<ComparisonRow<T>>[] = [
    {
      title: '对比项',
      dataIndex: 'label',
      key: 'label',
      width: 160,
      fixed: fixedLabel ? 'left' : undefined,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...recordNames.map((name, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: RECORD_COLORS[idx],
              marginRight: 8,
            }}
          />
          {name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'center' as const,
      render: (_: unknown, row: ComparisonRow<T>) => {
        const value = row.values[idx];
        return renderCell ? renderCell(value, row, idx) : <Text>{String(value)}</Text>;
      },
    })),
  ];

  // 构建完整数据源（添加 value_X 字段）
  const fullDataSource = dataSource.map((row) => ({
    ...row,
    ...recordNames.reduce(
      (acc, _, idx) => ({
        ...acc,
        [`value_${idx}`]: row.values[idx],
      }),
      {}
    ),
  }));

  return (
    <Table
      dataSource={fullDataSource}
      columns={columns}
      pagination={false}
      size={size}
      bordered={bordered}
      scroll={{ x: 'max-content' }}
    />
  );
}

export default ComparisonTable;