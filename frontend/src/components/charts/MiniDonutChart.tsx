/**
 * 迷你环图组件
 *
 * 用于 Hero 区域展示费用构成概览
 * - 紧凑尺寸适配 Hero 区域
 * - 支持点击交互展开完整饼图
 * - 显示费用占比百分比
 */
import React, { useMemo } from 'react';
import { Pie } from '@ant-design/charts';

export interface DonutDataItem {
  name: string;
  value: number;
  color?: string;
}

interface MiniDonutChartProps {
  data: DonutDataItem[];
  size?: number;
  onClick?: () => void;
}

// 费用项颜色映射
const COST_COLORS: Record<string, string> = {
  '存储费用': '#5470c6',
  'PUT 请求': '#91cc75',
  'GET 请求': '#fac858',
  '检索费用': '#ee6666',
  '传输费用': '#73c0de',
  '生命周期转换': '#3ba272',
};

const MiniDonutChart: React.FC<MiniDonutChartProps> = ({
  data,
  size = 120,
  onClick,
}) => {
  // 过滤零值并计算总和
  const filteredData = useMemo(() => {
    return data.filter(item => item.value > 0);
  }, [data]);

  const total = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.value, 0);
  }, [filteredData]);

  // 准备图表数据（带颜色）
  const chartData = useMemo(() => {
    return filteredData.map(item => ({
      ...item,
      color: item.color || COST_COLORS[item.name] || '#8884d8',
    }));
  }, [filteredData]);

  const config = {
    data: chartData,
    angleField: 'value',
    colorField: 'name',
    radius: 1,
    innerRadius: 0.65,
    label: false,
    legend: false,
    tooltip: {
      title: 'name',
      items: [
        {
          channel: 'y',
          valueFormatter: (value: number) => {
            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `$${value.toFixed(2)} (${percent}%)`;
          },
        },
      ],
    },
    state: {
      active: {
        style: {
          stroke: '#fff',
          lineWidth: 2,
        },
      },
    },
    interactions: [{ type: 'element-active' }],
  };

  if (filteredData.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)',
          fontSize: 12,
        }}
      >
        暂无数据
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
      }}
      onClick={onClick}
      title={onClick ? '点击查看详细费用占比' : undefined}
    >
      <Pie {...config} width={size} height={size} />
      {/* 中心标签 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 10, opacity: 0.8 }}>费用构成</div>
        <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>
          {filteredData.length} 项
        </div>
      </div>
    </div>
  );
};

export default MiniDonutChart;
