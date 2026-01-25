/**
 * 详细方案对比表格
 * 显示「用量 + 单价 + 费用」三元组，支持多方案对比
 */
import React from 'react';
import { Table, Tag, Typography, Alert } from 'antd';
import {
  StarOutlined,
  BulbOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ComparisonResult, ComparisonItem, CostBreakdown, UsageMetrics } from '../../types';

const { Text, Title } = Typography;

interface DetailedComparisonTableProps {
  comparison: ComparisonResult;
  metrics?: UsageMetrics;
  deviceCount: number;
}

// 费用项配置
interface CostRow {
  key: string;
  name: string;
  unit: string;
  getQuantity: (metrics?: UsageMetrics) => number | null;
  formatQuantity: (val: number) => string;
  getAmount: (breakdown?: CostBreakdown) => number;
  unitPrices: Record<string, number>;
}

// 费用项定义
const costRows: CostRow[] = [
  {
    key: 'storage',
    name: '存储费用',
    unit: '/GB/月',
    getQuantity: (metrics) => metrics?.avg_storage_gb || null,
    formatQuantity: (val) => `${(val / 1024).toFixed(2)} TB`,
    getAmount: (breakdown) => breakdown?.storage_cost || 0,
    unitPrices: { 'S3 Standard': 0.025, 'S3 Glacier IR': 0.004, 'Lifecycle Policy': 0.015 },
  },
  {
    key: 'put',
    name: 'PUT 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.put_request_cost || 0,
    unitPrices: { 'S3 Standard': 0.0047, 'S3 Glacier IR': 0.02, 'Lifecycle Policy': 0.01 },
  },
  {
    key: 'get',
    name: 'GET 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_gets || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.get_request_cost || 0,
    unitPrices: { 'S3 Standard': 0.00037, 'S3 Glacier IR': 0.01, 'Lifecycle Policy': 0.005 },
  },
  {
    key: 'retrieval',
    name: '数据检索费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_retrieval_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.retrieval_cost || 0,
    unitPrices: { 'S3 Standard': 0, 'S3 Glacier IR': 0.03, 'Lifecycle Policy': 0.015 },
  },
  {
    key: 'transfer',
    name: '数据传输费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_transfer_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.data_transfer_cost || 0,
    unitPrices: { 'S3 Standard': 0.114, 'S3 Glacier IR': 0.114, 'Lifecycle Policy': 0.114 },
  },
  {
    key: 'lifecycle',
    name: '生命周期转换费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: () => '-',
    getAmount: (breakdown) => breakdown?.lifecycle_cost || 0,
    unitPrices: { 'S3 Standard': 0, 'S3 Glacier IR': 0.02, 'Lifecycle Policy': 0.02 },
  },
];

const DetailedComparisonTable: React.FC<DetailedComparisonTableProps> = ({
  comparison,
  metrics,
  deviceCount,
}) => {
  // 格式化金额
  const formatAmount = (val: number) => {
    if (val === 0) return '-';
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 格式化单价
  const formatUnitPrice = (price: number) => {
    if (price === 0) return '-';
    return `@$${price}`;
  };

  // 计算相对节省百分比
  const formatSavings = (item: ComparisonItem) => {
    if (item.vs_baseline === 0) {
      return (
        <Tag color="blue" icon={<StarOutlined />}>
          基准线
        </Tag>
      );
    }
    const percent = (item.vs_baseline * 100).toFixed(1);
    return (
      <Tag color={item.vs_baseline < 0 ? 'green' : 'red'}>
        {item.vs_baseline < 0 ? '' : '+'}
        {percent}%
      </Tag>
    );
  };

  // 构建表格列
  const columns = [
    {
      title: '费用项目',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      fixed: 'left' as const,
      render: (text: string, record: any) => (
        <Text strong={record.isTotal}>{text}</Text>
      ),
    },
    {
      title: '单价',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    // 为每个方案添加列
    ...comparison.items.map((item) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div>
            {item.name}
            {item.is_recommended && (
              <Tag color="green" style={{ marginLeft: 8 }}>
                推荐
              </Tag>
            )}
          </div>
        </div>
      ),
      children: [
        {
          title: '用量',
          dataIndex: `${item.name}_quantity`,
          key: `${item.name}_quantity`,
          width: 100,
          align: 'right' as const,
          render: (_: any, record: any) => {
            if (record.isTotal || record.isSummary) return null;
            const quantity = record.getQuantity?.(metrics);
            if (quantity === null || quantity === undefined) return '-';
            return (
              <div>
                <div>{record.formatQuantity(quantity)}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {formatUnitPrice(record.unitPrices[item.name] || 0)}
                </div>
              </div>
            );
          },
        },
        {
          title: '费用',
          dataIndex: `${item.name}_amount`,
          key: `${item.name}_amount`,
          width: 100,
          align: 'right' as const,
          render: (_: any, record: any) => {
            if (record.isTotal) {
              return (
                <Text strong style={{ fontSize: 16 }}>
                  {formatAmount(item.monthly_cost)}
                </Text>
              );
            }
            if (record.isSummary) {
              if (record.key === 'yearly') {
                return formatAmount(item.yearly_cost);
              }
              if (record.key === 'per_device') {
                return formatAmount(item.monthly_cost / deviceCount);
              }
              if (record.key === 'savings') {
                return formatSavings(item);
              }
            }
            const amount = record.getAmount?.(item.breakdown);
            return formatAmount(amount || 0);
          },
        },
      ],
    })),
  ];

  // 构建表格数据
  const dataSource = [
    ...costRows.map((row) => ({
      ...row,
      key: row.key,
    })),
    {
      key: 'total',
      name: '月度总计',
      unit: '',
      isTotal: true,
    },
    {
      key: 'yearly',
      name: '年度总计',
      unit: '',
      isSummary: true,
    },
    {
      key: 'per_device',
      name: '单设备/月',
      unit: '',
      isSummary: true,
    },
    {
      key: 'savings',
      name: '相对节省',
      unit: '',
      isSummary: true,
    },
  ];

  return (
    <div className="detailed-comparison">
      <div className="detailed-comparison-header">
        <Title level={5} style={{ margin: 0 }}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          方案对比
        </Title>
      </div>

      <Table
        className="detailed-comparison-table"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        bordered
        size="middle"
        scroll={{ x: 'max-content' }}
        rowClassName={(record: any) => {
          if (record.isTotal) return 'comparison-row-total';
          if (record.isSummary) return 'comparison-row-summary';
          return '';
        }}
      />

      {/* 推荐理由 */}
      {comparison.recommendation && (
        <Alert
          className="detailed-comparison-recommendation"
          type="success"
          icon={<BulbOutlined />}
          message={
            <span>
              <Text strong>推荐理由：</Text>
              {comparison.recommendation.reason}
            </span>
          }
          description={
            comparison.recommendation.suggestions &&
            comparison.recommendation.suggestions.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">优化建议：</Text>
                <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
                  {comparison.recommendation.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )
          }
          showIcon
        />
      )}
    </div>
  );
};

export default DetailedComparisonTable;
