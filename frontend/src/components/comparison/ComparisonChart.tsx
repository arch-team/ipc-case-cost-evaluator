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

// 费用项配置：键名、中文名、颜色
const COST_ITEMS = [
  { key: 'storage_cost', name: '存储费用', color: '#1890ff' },
  { key: 'put_request_cost', name: 'PUT请求费', color: '#52c41a' },
  { key: 'get_request_cost', name: 'GET请求费', color: '#faad14' },
  { key: 'retrieval_cost', name: '数据检索费', color: '#eb2f96' },
  { key: 'data_transfer_cost', name: '数据传输费', color: '#722ed1' },
  { key: 'lifecycle_cost', name: '生命周期费', color: '#13c2c2' },
];

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

  // 费用构成数据（堆叠图）- 添加颜色字段
  const breakdownData = useMemo(() => {
    const data: { scheme: string; costType: string; value: number; color: string }[] = [];

    comparison.items.forEach((item) => {
      if (item.breakdown) {
        COST_ITEMS.forEach(({ key, name, color }) => {
          const value = item.breakdown?.[key as keyof typeof item.breakdown] || 0;
          if (typeof value === 'number' && value > 0) {
            data.push({
              scheme: item.name,
              costType: name,
              value: Number(value.toFixed(2)),
              color,
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

  // 颜色映射
  const colorMap: Record<string, string> = {};
  COST_ITEMS.forEach(item => { colorMap[item.name] = item.color; });

  // 费用构成堆叠柱状图配置
  const breakdownConfig = {
    data: breakdownData,
    xField: 'scheme',
    yField: 'value',
    colorField: 'costType',
    stack: true,
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
    </div>
  );
};

export default ComparisonChart;
