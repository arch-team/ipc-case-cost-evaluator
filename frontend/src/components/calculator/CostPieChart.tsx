/**
 * 费用明细饼图
 */
import React, { useMemo } from 'react';
import { Pie } from '@ant-design/charts';
import type { CostBreakdown } from '../../types';

interface Props {
  breakdown: CostBreakdown;
}

interface ChartData {
  name: string;
  value: number;
}

const CostPieChart: React.FC<Props> = React.memo(({ breakdown }) => {
  const data = useMemo<ChartData[]>(() => {
    const items: ChartData[] = [
      { name: '存储费用', value: breakdown.storage_cost },
      { name: 'PUT 请求', value: breakdown.put_request_cost },
      { name: 'GET 请求', value: breakdown.get_request_cost },
    ];

    if (breakdown.retrieval_cost && breakdown.retrieval_cost > 0) {
      items.push({ name: '检索费用', value: breakdown.retrieval_cost });
    }
    if (breakdown.data_transfer_cost && breakdown.data_transfer_cost > 0) {
      items.push({ name: '传输费用', value: breakdown.data_transfer_cost });
    }
    if (breakdown.lifecycle_cost && breakdown.lifecycle_cost > 0) {
      items.push({ name: '生命周期转换', value: breakdown.lifecycle_cost });
    }

    // 过滤掉零值
    return items.filter((item) => item.value > 0);
  }, [breakdown]);

  const config = {
    data,
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    innerRadius: 0.5,
    label: {
      text: (d: ChartData) => `${d.name}\n$${d.value.toFixed(2)}`,
      position: 'outside' as const,
    },
    legend: {
      color: {
        position: 'bottom' as const,
        layout: {
          justifyContent: 'center',
        },
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
    interactions: [{ type: 'element-active' }],
  };

  if (data.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无费用数据</div>;
  }

  return <Pie {...config} height={300} />;
});

CostPieChart.displayName = 'CostPieChart';

export default CostPieChart;
