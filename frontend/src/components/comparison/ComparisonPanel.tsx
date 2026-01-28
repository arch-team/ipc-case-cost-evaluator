/**
 * 方案对比面板
 * 整合表格视图和图表视图，支持切换显示
 * 定价数据从后端 API 动态获取
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
import type { ComparisonResult, ComparisonItem, UsageMetrics, StorageClass, RegionPricing } from '../../types';
import {
  SCHEME_COLORS,
  COST_ITEMS,
  getTechDescription
} from '../../constants/comparison';
import { formatAmount, formatUnitPrice } from '../../utils/formatters';
import { COST_ROW_CONFIGS, type CostRowConfig } from '../../config/costCalculation';
import { usePricing } from '../../hooks/usePricing';

const { Text, Title } = Typography;

// 格式化推荐理由文本，将百分比数字加粗
const formatReasonWithBoldPercent = (reason: string): React.ReactNode => {
  // 匹配百分比数字，如 38.3%、50%、100% 等
  const parts = reason.split(/(\d+\.?\d*%)/g);
  return parts.map((part, index) => {
    if (/\d+\.?\d*%/.test(part)) {
      return <Text key={index} strong>{part}</Text>;
    }
    return part;
  });
};

/**
 * 从定价数据中获取指定存储类型的单价
 */
function getUnitPrice(
  pricing: RegionPricing | undefined,
  storageClass: StorageClass | undefined,
  pricingField: CostRowConfig['pricingField']
): number {
  if (!pricing || !storageClass) return 0;

  // 数据传输费用是全局的，不按存储类型区分
  if (pricingField === 'out_first_10tb_per_gb') {
    return pricing.data_transfer.out_first_10tb_per_gb;
  }

  const classInfo = pricing.storage_classes[storageClass];
  if (!classInfo) return 0;

  return classInfo[pricingField as keyof typeof classInfo] || 0;
}

interface Props {
  comparison: ComparisonResult;
  metrics?: UsageMetrics;
  deviceCount: number;
  region: string;
}

// 表格行类型
interface TableRow extends Partial<CostRowConfig> {
  key: string;
  name: string;
  unit: string;
  isTotal?: boolean;
  isSummary?: boolean;
}

const ComparisonPanel: React.FC<Props> = ({ comparison, metrics, deviceCount, region }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartMode, setChartMode] = useState<'total' | 'breakdown'>('total');

  // 从 API 获取定价数据
  const { data: pricing } = usePricing(region);

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
  // 获取第一个方案的单价（所有方案共享相同的定价，因为只有一个区域）
  const firstScheme = comparison.items[0];
  const firstStorageClass = firstScheme?.technical?.storage_class as StorageClass;

  const tableColumns = [
    {
      title: '费用项目',
      dataIndex: 'name',
      key: 'name',
      width: 110,
      fixed: 'left' as const,
      render: (text: string, record: TableRow) => (
        <Text strong={record.isTotal}>{text}</Text>
      ),
    },
    {
      title: '单价',
      dataIndex: 'unit',
      key: 'unit',
      width: 110,
      render: (_: string, record: TableRow) => {
        if (record.isTotal || record.isSummary) return null;
        const unitPrice = record.pricingField
          ? getUnitPrice(pricing, firstStorageClass, record.pricingField)
          : 0;
        if (unitPrice === 0) return <Text type="secondary">-</Text>;
        return (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatUnitPrice(unitPrice, record.unit || '')}
          </Text>
        );
      },
    },
    ...comparison.items.map((item) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>{item.name}</span>
            {item.is_recommended && (
              <Tag color="green" style={{ margin: 0, fontSize: 11, padding: '0 6px', lineHeight: '18px' }}>
                推荐
              </Tag>
            )}
          </div>
          {getTechDescription(item).map((line, idx) => (
            <div key={idx} style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 400, marginTop: idx === 0 ? 2 : 0 }}>
              {line}
            </div>
          ))}
        </div>
      ),
      children: [
        {
          title: '用量',
          dataIndex: `${item.name}_quantity`,
          key: `${item.name}_quantity`,
          width: 110,
          align: 'right' as const,
          render: (_: unknown, record: TableRow) => {
            if (record.isTotal || record.isSummary) return null;
            const quantity = record.getQuantity?.(metrics);
            if (quantity === null || quantity === undefined) return <Text type="secondary">-</Text>;
            return (
              <div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {record.formatQuantity?.(quantity)}
                </div>
                {record.formula && (
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {record.formula}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          title: '费用',
          dataIndex: `${item.name}_amount`,
          key: `${item.name}_amount`,
          width: 110,
          align: 'right' as const,
          render: (_: unknown, record: TableRow) => {
            if (record.isTotal) {
              return (
                <Text strong style={{ fontSize: 15, color: 'var(--color-primary)' }}>
                  {formatAmount(item.monthly_cost)}
                </Text>
              );
            }
            if (record.isSummary) {
              if (record.key === 'yearly') {
                return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmount(item.yearly_cost)}</span>;
              }
              if (record.key === 'per_device') {
                return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmount(item.monthly_cost / deviceCount)}</span>;
              }
              if (record.key === 'savings') {
                return formatSavings(item);
              }
            }
            const amount = record.getAmount?.(item.breakdown);
            // 生成费用计算公式
            const costFormula = record.getCostFormula?.({
              pricing,
              technical: item.technical,
              metrics,
            });
            return (
              <div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(amount || 0)}
                </div>
                {costFormula && (
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {costFormula}
                  </div>
                )}
              </div>
            );
          },
        },
      ],
    })),
  ];

  const tableDataSource = [
    ...COST_ROW_CONFIGS.map((row) => ({
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
    return comparison.items.map((item, index) => {
      const techLines = getTechDescription(item);
      const label = `${item.name}\n${techLines.join('\n')}`;
      return {
        scheme: label,
        value: Number(item.monthly_cost.toFixed(2)),
        isRecommended: item.is_recommended,
        index,
        techDescription: techLines,
        name: item.name,
      };
    });
  }, [comparison]);

  const breakdownData = useMemo(() => {
    const data: { scheme: string; costType: string; value: number }[] = [];
    comparison.items.forEach((item) => {
      if (item.breakdown) {
        const techLines = getTechDescription(item);
        const label = `${item.name}\n${techLines.join('\n')}`;
        COST_ITEMS.forEach(({ key, name }) => {
          const value = item.breakdown?.[key as keyof typeof item.breakdown] || 0;
          if (typeof value === 'number' && value > 0) {
            data.push({
              scheme: label,
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
    paddingLeft: 60,
    paddingRight: 60,
    label: {
      text: (d: { value: number }) => `$${d.value.toLocaleString()}`,
      textBaseline: 'bottom' as const,
      style: { fontSize: 11, fontWeight: 600 },
    },
    style: {
      maxWidth: 60,
      radiusTopLeft: 4,
      radiusTopRight: 4,
      fill: (d: { index: number; isRecommended: boolean }) =>
        d.isRecommended ? '#52c41a' : SCHEME_COLORS[d.index % SCHEME_COLORS.length],
    },
    axis: {
      x: { title: false },
      y: {
        title: false,
        labelFormatter: (v: number) => `$${v.toLocaleString()}`,
      },
    },
    tooltip: {
      title: (d: { name: string; techDescription: string[] }) => `${d.name} (${d.techDescription[0]})`,
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
    paddingLeft: 60,
    paddingRight: 60,
    style: {
      maxWidth: 60,
    },
    scale: {
      color: { range: COST_ITEMS.map(item => item.color) },
    },
    axis: {
      x: { title: false },
      y: {
        title: false,
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
              {formatReasonWithBoldPercent(comparison.recommendation.reason)}
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
