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

// 存储类型名称映射
const STORAGE_CLASS_NAMES: Record<string, string> = {
  'STANDARD': 'S3 Standard',
  'GLACIER_IR': 'S3 Glacier IR',
  'DEEP_ARCHIVE': 'S3 Deep Archive',
};

// 生成技术配置描述
const getTechDescription = (item: ComparisonItem): string[] => {
  const technical = item.technical;
  if (!technical) {
    return [item.storage_class];
  }

  const lines: string[] = [];

  // 检查是否启用生命周期策略
  if (technical.lifecycle_policy?.enabled) {
    const policy = technical.lifecycle_policy;

    // 如果有阶段配置
    if (policy.stages && policy.stages.length > 0) {
      const stageDescs = policy.stages.map(stage => {
        const className = STORAGE_CLASS_NAMES[stage.storage_class] || stage.storage_class;
        if (stage.start_day === stage.end_day) {
          return `第${stage.start_day}天: ${className}`;
        }
        return `${stage.start_day}-${stage.end_day}天: ${className}`;
      });
      lines.push(`生命周期策略 (${policy.stages.length}阶段)`);
      lines.push(stageDescs.join(' → '));
    } else if (policy.transition_days && policy.target_class) {
      // 简单模式
      const targetName = STORAGE_CLASS_NAMES[policy.target_class] || policy.target_class;
      lines.push(`生命周期策略`);
      lines.push(`${policy.transition_days}天后 → ${targetName}`);
    } else {
      lines.push('生命周期策略');
    }
  } else {
    // 单一存储类型
    const className = STORAGE_CLASS_NAMES[technical.storage_class] || technical.storage_class;
    lines.push(className);
  }

  return lines;
};

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

// 表格行类型（包含费用行和汇总行）
interface TableRow extends Partial<CostRow> {
  key: string;
  name: string;
  unit: string;
  isTotal?: boolean;
  isSummary?: boolean;
}

// AWS 真实定价（ap-northeast-1 区域）
// 注意：这些单价应与后端 aws_pricing JSON 文件保持一致
const AWS_PRICING = {
  'S3 Standard': {
    storage: 0.025,      // USD/GB/月
    put: 0.0047,         // USD/千次
    get: 0.0004,         // USD/千次
    retrieval: 0,        // S3 Standard 无检索费
    transfer: 0.114,     // USD/GB（前 10TB）
    lifecycle: 0,        // S3 Standard 无生命周期转换费
  },
  'S3 Glacier IR': {
    storage: 0.005,      // USD/GB/月
    put: 0.02,           // USD/千次
    get: 0.01,           // USD/千次
    retrieval: 0.03,     // USD/GB
    transfer: 0.114,     // USD/GB（前 10TB）
    lifecycle: 0.02,     // USD/千次
  },
  'Lifecycle Policy': {
    // 生命周期策略使用加权平均单价（混合存储类型）
    storage: 0.015,      // 加权平均
    put: 0.01,           // 加权平均
    get: 0.005,          // 加权平均
    retrieval: 0.015,    // 加权平均
    transfer: 0.114,     // USD/GB
    lifecycle: 0.02,     // USD/千次
  },
};

// 费用项定义
const costRows: CostRow[] = [
  {
    key: 'storage',
    name: '存储费用',
    unit: '/GB/月',
    getQuantity: (metrics) => metrics?.avg_storage_gb || null,
    formatQuantity: (val) => `${(val / 1024).toFixed(2)} TB`,
    getAmount: (breakdown) => breakdown?.storage_cost || 0,
    unitPrices: { 'S3 Standard': AWS_PRICING['S3 Standard'].storage, 'S3 Glacier IR': AWS_PRICING['S3 Glacier IR'].storage, 'Lifecycle Policy': AWS_PRICING['Lifecycle Policy'].storage },
  },
  {
    key: 'put',
    name: 'PUT 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.put_request_cost || 0,
    unitPrices: { 'S3 Standard': AWS_PRICING['S3 Standard'].put, 'S3 Glacier IR': AWS_PRICING['S3 Glacier IR'].put, 'Lifecycle Policy': AWS_PRICING['Lifecycle Policy'].put },
  },
  {
    key: 'get',
    name: 'GET 请求费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_gets || null,
    formatQuantity: (val) => `${(val / 10000).toFixed(0)} 万次`,
    getAmount: (breakdown) => breakdown?.get_request_cost || 0,
    unitPrices: { 'S3 Standard': AWS_PRICING['S3 Standard'].get, 'S3 Glacier IR': AWS_PRICING['S3 Glacier IR'].get, 'Lifecycle Policy': AWS_PRICING['Lifecycle Policy'].get },
  },
  {
    key: 'retrieval',
    name: '数据检索费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_retrieval_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.retrieval_cost || 0,
    unitPrices: { 'S3 Standard': AWS_PRICING['S3 Standard'].retrieval, 'S3 Glacier IR': AWS_PRICING['S3 Glacier IR'].retrieval, 'Lifecycle Policy': AWS_PRICING['Lifecycle Policy'].retrieval },
  },
  {
    key: 'transfer',
    name: '数据传输费',
    unit: '/GB',
    getQuantity: (metrics) => metrics?.monthly_transfer_gb || null,
    formatQuantity: (val) => (val > 0 ? `${(val / 1024).toFixed(2)} TB` : '-'),
    getAmount: (breakdown) => breakdown?.data_transfer_cost || 0,
    unitPrices: { 'S3 Standard': AWS_PRICING['S3 Standard'].transfer, 'S3 Glacier IR': AWS_PRICING['S3 Glacier IR'].transfer, 'Lifecycle Policy': AWS_PRICING['Lifecycle Policy'].transfer },
  },
  {
    key: 'lifecycle',
    name: '生命周期转换费',
    unit: '/千次',
    getQuantity: (metrics) => metrics?.monthly_puts || null,
    formatQuantity: () => '-',
    getAmount: (breakdown) => breakdown?.lifecycle_cost || 0,
    unitPrices: { 'S3 Standard': AWS_PRICING['S3 Standard'].lifecycle, 'S3 Glacier IR': AWS_PRICING['S3 Glacier IR'].lifecycle, 'Lifecycle Policy': AWS_PRICING['Lifecycle Policy'].lifecycle },
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

  // 格式化单价（支持小数位数自适应）
  const formatUnitPrice = (price: number, unit: string) => {
    if (price === 0) return '-';
    // 根据价格大小决定小数位数
    const decimals = price < 0.001 ? 5 : price < 0.01 ? 4 : price < 0.1 ? 3 : 2;
    return `$${price.toFixed(decimals)}${unit}`;
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
      render: (text: string, record: TableRow) => (
        <Text strong={record.isTotal}>{text}</Text>
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (text: string, record: TableRow) => (
        <Text type="secondary">{record.isTotal || record.isSummary ? '' : text}</Text>
      ),
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
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 400, marginTop: 4 }}>
            {getTechDescription(item).map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        </div>
      ),
      children: [
        {
          title: '用量',
          dataIndex: `${item.name}_quantity`,
          key: `${item.name}_quantity`,
          width: 120,
          align: 'right' as const,
          render: (_: unknown, record: TableRow) => {
            if (record.isTotal || record.isSummary) return null;
            const quantity = record.getQuantity?.(metrics);
            if (quantity === null || quantity === undefined) return '-';
            // 使用 storage_class 查找单价，而不是 name
            const unitPrice = record.unitPrices?.[item.storage_class] || 0;
            return (
              <div>
                <div>{record.formatQuantity?.(quantity)}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {formatUnitPrice(unitPrice, record.unit || '')}
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
          render: (_: unknown, record: TableRow) => {
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
        rowClassName={(record: TableRow) => {
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
