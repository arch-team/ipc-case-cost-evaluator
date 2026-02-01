/**
 * 核算记录费用对比柱状图组件
 *
 * 配色优化：
 * - 使用方案专属色（蓝、绿、橙、紫）便于视觉区分
 * - 进度条使用渐变效果增加视觉层次
 * - 仅最优值使用绿色高亮，其他使用中性色
 */
import React from 'react';
import { Card, Typography, Progress } from 'antd';
import { Column } from '@ant-design/charts';
import type { CalculationRecord } from '../../types/calculationRecords';
import { COMPARISON_CONFIG } from '../../constants/comparison';
import { formatNumber } from '../../utils/formatters';

const { Title, Text } = Typography;

// 使用 COMPARISON_CONFIG 中的方案专属色
const RECORD_COLORS = COMPARISON_CONFIG.recordColors;

interface Props {
  records: CalculationRecord[];
}

const RecordComparisonChart: React.FC<Props> = ({ records }) => {
  // 使用 record_id 作为唯一标识符（避免同名记录被合并）
  const recordIds = records.map((r) => r.record_id);

  // 构建图表数据 - 使用 record_id 作为 colorField 的值
  const chartData = records.flatMap((record) => {
    return [
      { recordId: record.record_id, recordName: record.name, category: '存储', value: record.cost_summary.storage_cost },
      { recordId: record.record_id, recordName: record.name, category: 'PUT请求', value: record.cost_summary.put_request_cost },
      { recordId: record.record_id, recordName: record.name, category: 'GET请求', value: record.cost_summary.get_request_cost },
      { recordId: record.record_id, recordName: record.name, category: '检索', value: record.cost_summary.retrieval_cost },
      { recordId: record.record_id, recordName: record.name, category: '转换', value: record.cost_summary.lifecycle_cost },
      { recordId: record.record_id, recordName: record.name, category: '传输', value: record.cost_summary.data_transfer_cost },
    ];
  });

  const config = {
    data: chartData,
    xField: 'category',
    yField: 'value',
    colorField: 'recordId', // 使用唯一 ID 区分颜色
    // 使用 transform dodgeX 实现分组柱状图（@ant-design/charts 2.x 推荐方式）
    transform: [{ type: 'dodgeX' }],
    scale: {
      color: {
        type: 'ordinal' as const,
        domain: recordIds,
        range: [...RECORD_COLORS].slice(0, records.length),
      },
    },
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
      maxWidth: 40,
    },
    label: {
      text: (d: { value: number }) => `$${d.value.toFixed(2)}`,
      position: 'top' as const,
      dy: -4,
      style: { fontSize: 10 },
    },
    axis: {
      y: {
        labelFormatter: (v: number) => `$${v}`,
      },
    },
    legend: false, // 下方已有月度总成本图例，隐藏重复图例
    tooltip: {
      title: (d: { recordName: string }) => d.recordName, // 显示可读名称
      items: [
        {
          field: 'value',
          name: '费用',
          valueFormatter: (v: number) => `$${v.toFixed(4)}`,
        },
      ],
    },
  };

  // 计算总成本相关数据
  const totalCosts = records.map((r) => r.cost_summary.total_cost);
  const maxCost = Math.max(...totalCosts);
  const minCost = Math.min(...totalCosts);

  return (
    <Card title="费用构成对比" size="small">
      <Column {...config} height={280} />

      {/* 总成本对比条 */}
      <div style={{ marginTop: 16 }}>
        <Title level={5} style={{ marginBottom: 12 }}>月度总成本</Title>
        {records.map((r, i) => {
          const percent = maxCost > 0 ? (r.cost_summary.total_cost / maxCost) * 100 : 0;
          const isMin = r.cost_summary.total_cost === minCost && records.length > 1;

          return (
            <div key={r.record_id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: RECORD_COLORS[i],
                      marginRight: 8,
                    }}
                  />
                  {r.name}
                </Text>
                <Text
                  strong
                  style={{
                    // 仅最优值使用绿色，其他使用中性深灰色
                    color: isMin
                      ? COMPARISON_CONFIG.semanticColors.saving
                      : COMPARISON_CONFIG.semanticColors.neutral,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ${formatNumber(r.cost_summary.total_cost, 4)}
                </Text>
              </div>
              <Progress
                percent={percent}
                showInfo={false}
                strokeColor={{
                  '0%': RECORD_COLORS[i],
                  '100%': `${RECORD_COLORS[i]}cc`,
                }}
                size="small"
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RecordComparisonChart;
