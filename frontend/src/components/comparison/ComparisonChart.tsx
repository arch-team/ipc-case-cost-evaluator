/**
 * 方案对比柱状图
 * 以柱状图形式展示各方案的月度成本对比
 */
import React, { useMemo } from 'react';
import { Column } from '@ant-design/charts';
import { Typography, Segmented } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import type { ComparisonResult } from '../../types';

const { Title, Text } = Typography;

interface Props {
  comparison: ComparisonResult;
}

// 方案颜色（协调的配色方案）
const SCHEME_COLORS = ['#5B8FF9', '#61DDAA', '#F6BD16', '#7262FD'];

// 费用项配置：键名、中文名、颜色
const COST_ITEMS = [
  { key: 'storage_cost', name: '存储费用', color: '#5B8FF9' },
  { key: 'put_request_cost', name: 'PUT请求费', color: '#5AD8A6' },
  { key: 'get_request_cost', name: 'GET请求费', color: '#F6BD16' },
  { key: 'retrieval_cost', name: '数据检索费', color: '#E86452' },
  { key: 'data_transfer_cost', name: '数据传输费', color: '#6DC8EC' },
  { key: 'lifecycle_cost', name: '生命周期费', color: '#945FB9' },
];

// 存储类型名称映射
const STORAGE_CLASS_NAMES: Record<string, string> = {
  'STANDARD': 'S3 Standard',
  'GLACIER_IR': 'Glacier IR',
  'DEEP_ARCHIVE': 'Deep Archive',
};

// 生成技术配置简短描述
const getTechSummary = (item: ComparisonResult['items'][0]): string => {
  const technical = item.technical;
  if (!technical) return item.storage_class;

  if (technical.lifecycle_policy?.enabled) {
    const policy = technical.lifecycle_policy;
    if (policy.stages && policy.stages.length > 0) {
      return `生命周期(${policy.stages.length}阶段)`;
    }
    return '生命周期策略';
  }

  return STORAGE_CLASS_NAMES[technical.storage_class] || technical.storage_class;
};

const ComparisonChart: React.FC<Props> = ({ comparison }) => {
  const [viewMode, setViewMode] = React.useState<'total' | 'breakdown'>('total');

  // 月度总成本数据 - 添加索引用于颜色
  const totalCostData = useMemo(() => {
    return comparison.items.map((item, index) => ({
      scheme: item.name,
      value: Number(item.monthly_cost.toFixed(2)),
      isRecommended: item.is_recommended,
      index,
      techSummary: getTechSummary(item),
    }));
  }, [comparison]);

  // 费用构成数据（堆叠图）
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

  // 总成本柱状图配置
  const totalConfig = {
    data: totalCostData,
    xField: 'scheme',
    yField: 'value',
    maxWidth: 50,
    label: {
      text: (d: { value: number }) => `$${d.value.toLocaleString()}`,
      textBaseline: 'bottom' as const,
      style: {
        fontSize: 11,
        fontWeight: 600,
      },
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
      fill: (d: { index: number; isRecommended: boolean }) =>
        d.isRecommended ? '#52c41a' : SCHEME_COLORS[d.index % SCHEME_COLORS.length],
    },
    axis: {
      x: {
        title: false,
        labelAutoRotate: false,
      },
      y: {
        title: '月度成本 (USD)',
        labelFormatter: (v: number) => `$${v.toLocaleString()}`,
      },
    },
    tooltip: {
      title: (d: { scheme: string; techSummary: string }) => `${d.scheme} (${d.techSummary})`,
      items: [
        {
          field: 'value',
          name: '月度成本',
          valueFormatter: (v: number) => `$${v.toLocaleString()}`,
        },
      ],
    },
    interaction: {
      elementHighlight: true,
    },
  };

  // 费用构成堆叠柱状图配置
  const breakdownConfig = {
    data: breakdownData,
    xField: 'scheme',
    yField: 'value',
    colorField: 'costType',
    stack: true,
    maxWidth: 50,
    scale: {
      color: {
        range: COST_ITEMS.map(item => item.color),
      },
    },
    axis: {
      x: {
        title: false,
      },
      y: {
        title: '月度成本 (USD)',
        labelFormatter: (v: number) => `$${v}`,
      },
    },
    legend: {
      color: {
        position: 'bottom' as const,
        layout: {
          justifyContent: 'center' as const,
        },
      },
    },
  };

  if (comparison.items.length === 0) {
    return null;
  }

  return (
    <div className="comparison-chart" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          成本对比图
        </Title>
        <Segmented
          size="small"
          options={[
            { label: '总成本', value: 'total' },
            { label: '费用构成', value: 'breakdown' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as 'total' | 'breakdown')}
        />
      </div>

      <div style={{ height: 300 }}>
        {viewMode === 'total' ? (
          <Column key="total" {...totalConfig} />
        ) : (
          <Column key="breakdown" {...breakdownConfig} />
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
        {comparison.items.map((item, index) => (
          <div key={item.name} style={{ textAlign: 'center', flex: 1 }}>
            <Text strong style={{
              color: item.is_recommended ? '#52c41a' : SCHEME_COLORS[index % SCHEME_COLORS.length],
              fontSize: 12,
            }}>
              {item.name}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {getTechSummary(item)}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComparisonChart;
