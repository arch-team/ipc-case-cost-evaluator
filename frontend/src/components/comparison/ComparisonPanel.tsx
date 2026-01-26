/**
 * 方案对比面板
 * 整合表格视图和图表视图，支持切换显示
 */
import React, { useState, useMemo } from 'react';
import { Table, Tag, Typography, Alert, Segmented } from 'antd';
import { Column } from '@ant-design/charts';
import {
  StarOutlined,
  BulbOutlined,
  InfoCircleOutlined,
  TableOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ComparisonResult, ComparisonItem, CostBreakdown, UsageMetrics } from '../../types';

const { Text, Title } = Typography;

// 存储类型名称映射
const STORAGE_CLASS_NAMES: Record<string, string> = {
  'STANDARD': 'S3 Standard',
  'GLACIER_IR': 'S3 Glacier IR',
  'DEEP_ARCHIVE': 'S3 Deep Archive',
};

// 方案颜色
const SCHEME_COLORS = ['#5B8FF9', '#61DDAA', '#F6BD16', '#7262FD'];

// 费用项配置
const COST_ITEMS = [
  { key: 'storage_cost', name: '存储费用', color: '#5B8FF9' },
  { key: 'put_request_cost', name: 'PUT请求费', color: '#5AD8A6' },
  { key: 'get_request_cost', name: 'GET请求费', color: '#F6BD16' },
  { key: 'retrieval_cost', name: '数据检索费', color: '#E86452' },
  { key: 'data_transfer_cost', name: '数据传输费', color: '#6DC8EC' },
  { key: 'lifecycle_cost', name: '生命周期费', color: '#945FB9' },
];

// AWS 定价
const AWS_PRICING = {
  'S3 Standard': {
    storage: 0.025,
    put: 0.0047,
    get: 0.0004,
    retrieval: 0,
    transfer: 0.114,
    lifecycle: 0,
  },
  'S3 Glacier IR': {
    storage: 0.005,
    put: 0.02,
    get: 0.01,
    retrieval: 0.03,
    transfer: 0.114,
    lifecycle: 0.02,
  },
  'Lifecycle Policy': {
    storage: 0.015,
    put: 0.01,
    get: 0.005,
    retrieval: 0.015,
    transfer: 0.114,
    lifecycle: 0.02,
  },
};

// 生成技术配置描述
const getTechDescription = (item: ComparisonItem): string[] => {
  const technical = item.technical;
  if (!technical) {
    return [item.storage_class];
  }

  const lines: string[] = [];

  if (technical.lifecycle_policy?.enabled) {
    const policy = technical.lifecycle_policy;

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
      const targetName = STORAGE_CLASS_NAMES[policy.target_class] || policy.target_class;
      lines.push(`生命周期策略`);
      lines.push(`${policy.transition_days}天后 → ${targetName}`);
    } else {
      lines.push('生命周期策略');
    }
  } else {
    const className = STORAGE_CLASS_NAMES[technical.storage_class] || technical.storage_class;
    lines.push(className);
  }

  return lines;
};

interface Props {
  comparison: ComparisonResult;
  metrics?: UsageMetrics;
  deviceCount: number;
}

// 费用项配置类型
interface CostRow {
  key: string;
  name: string;
  unit: string;
  getQuantity: (metrics?: UsageMetrics) => number | null;
  formatQuantity: (val: number) => string;
  getAmount: (breakdown?: CostBreakdown) => number;
  unitPrices: Record<string, number>;
}

// 表格行类型
interface TableRow extends Partial<CostRow> {
  key: string;
  name: string;
  unit: string;
  isTotal?: boolean;
  isSummary?: boolean;
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

const ComparisonPanel: React.FC<Props> = ({ comparison, metrics, deviceCount }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartMode, setChartMode] = useState<'total' | 'breakdown'>('total');

  // 格式化金额
  const formatAmount = (val: number) => {
    if (val === 0) return '-';
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 格式化单价
  const formatUnitPrice = (price: number, unit: string) => {
    if (price === 0) return '-';
    const decimals = price < 0.001 ? 5 : price < 0.01 ? 4 : price < 0.1 ? 3 : 2;
    return `$${price.toFixed(decimals)}${unit}`;
  };

  // 计算相对节省
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

  // === 表格配置 ===
  const tableColumns = [
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

  const tableDataSource = [
    ...costRows.map((row) => ({
      ...row,
      key: row.key,
    })),
    { key: 'total', name: '月度总计', unit: '', isTotal: true },
    { key: 'yearly', name: '年度总计', unit: '', isSummary: true },
    { key: 'per_device', name: '单设备/月', unit: '', isSummary: true },
    { key: 'savings', name: '相对节省', unit: '', isSummary: true },
  ];

  // === 图表配置 ===
  const totalCostData = useMemo(() => {
    return comparison.items.map((item, index) => ({
      scheme: item.name,
      value: Number(item.monthly_cost.toFixed(2)),
      isRecommended: item.is_recommended,
      index,
      techDescription: getTechDescription(item),
    }));
  }, [comparison]);

  const breakdownData = useMemo(() => {
    const data: { scheme: string; costType: string; value: number }[] = [];
    comparison.items.forEach((item) => {
      if (item.breakdown) {
        COST_ITEMS.forEach(({ key, name }) => {
          const value = item.breakdown?.[key as keyof typeof item.breakdown] || 0;
          if (typeof value === 'number' && value > 0) {
            data.push({
              scheme: item.name,
              costType: name,
              value: Number(value.toFixed(2)),
            });
          }
        });
      }
    });
    return data;
  }, [comparison]);

  const totalChartConfig = {
    data: totalCostData,
    xField: 'scheme',
    yField: 'value',
    maxWidth: 16,
    label: {
      text: (d: { value: number }) => `$${d.value.toLocaleString()}`,
      textBaseline: 'bottom' as const,
      style: { fontSize: 11, fontWeight: 600 },
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
      fill: (d: { index: number; isRecommended: boolean }) =>
        d.isRecommended ? '#52c41a' : SCHEME_COLORS[d.index % SCHEME_COLORS.length],
    },
    axis: {
      x: { title: false, labelAutoRotate: false },
      y: {
        title: '月度成本 (USD)',
        labelFormatter: (v: number) => `$${v.toLocaleString()}`,
      },
    },
    tooltip: {
      title: (d: { scheme: string; techDescription: string[] }) => `${d.scheme} (${d.techDescription[0]})`,
      items: [
        {
          field: 'value',
          name: '月度成本',
          valueFormatter: (v: number) => `$${v.toLocaleString()}`,
        },
      ],
    },
    interaction: { elementHighlight: true },
  };

  const breakdownChartConfig = {
    data: breakdownData,
    xField: 'scheme',
    yField: 'value',
    colorField: 'costType',
    stack: true,
    maxWidth: 16,
    scale: {
      color: { range: COST_ITEMS.map(item => item.color) },
    },
    axis: {
      x: { title: false },
      y: {
        title: '月度成本 (USD)',
        labelFormatter: (v: number) => `$${v}`,
      },
    },
    legend: {
      color: {
        position: 'bottom' as const,
        layout: { justifyContent: 'center' as const },
      },
    },
  };

  if (comparison.items.length === 0) {
    return null;
  }

  return (
    <div className="comparison-panel">
      {/* 标题和切换按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          方案对比
        </Title>
        <Segmented
          size="small"
          options={[
            { label: <span><TableOutlined /> 表格</span>, value: 'table' },
            { label: <span><BarChartOutlined /> 图表</span>, value: 'chart' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as 'table' | 'chart')}
        />
      </div>

      {/* 表格视图 */}
      {viewMode === 'table' && (
        <Table
          className="detailed-comparison-table"
          columns={tableColumns}
          dataSource={tableDataSource}
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
      )}

      {/* 图表视图 */}
      {viewMode === 'chart' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Segmented
              size="small"
              options={[
                { label: '总成本', value: 'total' },
                { label: '费用构成', value: 'breakdown' },
              ]}
              value={chartMode}
              onChange={(v) => setChartMode(v as 'total' | 'breakdown')}
            />
          </div>
          <div style={{ height: 380 }}>
            {chartMode === 'total' ? (
              <Column key="total" {...totalChartConfig} />
            ) : (
              <Column key="breakdown" {...breakdownChartConfig} />
            )}
          </div>
          {/* 技术配置说明 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--color-border-light)',
          }}>
            {comparison.items.map((item, index) => {
              const techLines = getTechDescription(item);
              return (
                <div key={item.name} style={{ textAlign: 'center', flex: 1 }}>
                  <Text strong style={{
                    color: item.is_recommended ? '#52c41a' : SCHEME_COLORS[index % SCHEME_COLORS.length],
                    fontSize: 12,
                  }}>
                    {item.name}
                  </Text>
                  {techLines.map((line, idx) => (
                    <div key={idx}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {line}
                      </Text>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 推荐理由 */}
      {comparison.recommendation && (
        <Alert
          className="detailed-comparison-recommendation"
          style={{ marginTop: 16 }}
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

export default ComparisonPanel;
