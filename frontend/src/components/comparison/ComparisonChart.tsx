/**
 * 方案对比柱状图
 * 以柱状图形式展示各方案的月度成本对比
 */
import React, { useMemo } from 'react';
import { Column } from '@ant-design/charts';
import { Typography, Segmented } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import type { ComparisonResult } from '../../types';
import { SCHEME_COLORS, COST_ITEMS, getTechDescription } from '../../constants/comparison';

const { Title, Text } = Typography;

interface Props {
  comparison: ComparisonResult;
}

const ComparisonChart: React.FC<Props> = ({ comparison }) => {
  const [viewMode, setViewMode] = React.useState<'total' | 'breakdown'>('total');

  // 月度总成本数据 - 添加索引用于颜色
  const totalCostData = useMemo(() => {
    return comparison.items.map((item, index) => ({
      scheme: item.name,
      value: Number(item.monthly_cost.toFixed(2)),
      isRecommended: item.is_recommended,
      index,
      techDescription: getTechDescription(item),
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
      title: (d: { scheme: string; techDescription: string[] }) => `${d.scheme} (${d.techDescription[0]})`,
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
    <div className="comparison-chart">
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
    </div>
  );
};

export default ComparisonChart;
