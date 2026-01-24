/**
 * 方案对比柱状图
 */
import React, { useMemo } from 'react';
import { Column } from '@ant-design/charts';
import type { ComparisonResult } from '../../types';

interface Props {
  comparison: ComparisonResult;
}

interface ChartData {
  name: string;
  type: string;
  value: number;
  isRecommended: boolean;
}

const ComparisonChart: React.FC<Props> = ({ comparison }) => {
  const data = useMemo<ChartData[]>(() => {
    const items: ChartData[] = [];
    const recommendedOption = comparison.recommendation?.recommended_option;

    comparison.items.forEach((item) => {
      const isRecommended = item.name === recommendedOption;
      items.push({
        name: item.name,
        type: '月度费用',
        value: item.monthly_cost,
        isRecommended,
      });
      items.push({
        name: item.name,
        type: '年度费用',
        value: item.yearly_cost,
        isRecommended,
      });
    });

    return items;
  }, [comparison]);

  const config = {
    data,
    xField: 'name',
    yField: 'value',
    colorField: 'type',
    group: true,
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
    },
    label: {
      text: (d: ChartData) => `$${d.value.toFixed(0)}`,
      textBaseline: 'bottom' as const,
      position: 'inside' as const,
      style: {
        fill: '#fff',
        fontSize: 10,
      },
    },
    legend: {
      color: {
        position: 'top' as const,
      },
    },
    tooltip: {
      title: 'name',
      items: [
        {
          channel: 'y',
          valueFormatter: (value: number) => `$${value.toFixed(2)}`,
        },
      ],
    },
    axis: {
      y: {
        title: '费用 ($)',
        labelFormatter: (value: number) => `$${value}`,
      },
      x: {
        title: '存储方案',
      },
    },
  };

  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无对比数据</div>;
  }

  return <Column {...config} height={350} />;
};

export default ComparisonChart;
