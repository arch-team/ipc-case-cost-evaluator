/**
 * 方案对比柱状图
 * 以柱状图形式展示各方案的月度成本对比
 */
import React, { useMemo } from 'react';
import { Column } from '@ant-design/charts';
import { Typography, Segmented } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import type { ComparisonResult } from '../../types';

const { Title } = Typography;

interface Props {
  comparison: ComparisonResult;
}

// 费用项键名到中文名的映射
const COST_ITEM_NAMES: Record<string, string> = {
  storage_cost: '存储费用',
  put_request_cost: 'PUT请求费',
  get_request_cost: 'GET请求费',
  retrieval_cost: '数据检索费',
  data_transfer_cost: '数据传输费',
  lifecycle_cost: '生命周期费',
};

// 费用项颜色
const COST_ITEM_COLORS: Record<string, string> = {
  存储费用: '#1890ff',
  'PUT请求费': '#52c41a',
  'GET请求费': '#faad14',
  数据检索费: '#eb2f96',
  数据传输费: '#722ed1',
  生命周期费: '#13c2c2',
};

const ComparisonChart: React.FC<Props> = ({ comparison }) => {
  const [viewMode, setViewMode] = React.useState<'total' | 'breakdown'>('total');

  // 月度总成本数据
  const totalCostData = useMemo(() => {
    return comparison.items.map((item) => ({
      scheme: item.name,
      value: Number(item.monthly_cost.toFixed(2)),
      isRecommended: item.is_recommended,
    }));
  }, [comparison]);

  // 费用构成数据（堆叠图）
  const breakdownData = useMemo(() => {
    const data: { scheme: string; costType: string; value: number }[] = [];

    comparison.items.forEach((item) => {
      if (item.breakdown) {
        Object.entries(COST_ITEM_NAMES).forEach(([key, name]) => {
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
    label: {
      text: (d: { value: number }) => `$${d.value.toLocaleString()}`,
      textBaseline: 'bottom' as const,
      style: {
        fontSize: 12,
        fontWeight: 600,
      },
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
      fill: (d: { isRecommended: boolean }) => (d.isRecommended ? '#52c41a' : '#1890ff'),
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
      title: (d: { scheme: string }) => d.scheme,
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
    scale: {
      color: {
        range: Object.values(COST_ITEM_COLORS),
      },
    },
    label: {
      text: (d: { value: number }) => (d.value > 20 ? `$${d.value.toFixed(0)}` : ''),
      position: 'inside' as const,
      style: {
        fontSize: 10,
        fill: '#fff',
      },
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
      title: (d: { scheme: string }) => d.scheme,
      items: [
        {
          field: 'value',
          name: (d: { costType: string }) => d.costType,
          valueFormatter: (v: number) => `$${v.toFixed(2)}`,
        },
      ],
    },
    legend: {
      color: {
        position: 'bottom' as const,
        layout: { justifyContent: 'center' as const },
      },
    },
    interaction: {
      elementHighlight: { background: true },
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
          <Column {...totalConfig} />
        ) : (
          <Column {...breakdownConfig} />
        )}
      </div>
    </div>
  );
};

export default ComparisonChart;
