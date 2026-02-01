/**
 * 核算记录费用对比柱状图组件
 */
import React from 'react';
import { Card, Typography, Progress } from 'antd';
import { Column } from '@ant-design/charts';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Title, Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

const RecordComparisonChart: React.FC<Props> = ({ records }) => {
  // 构建图表数据
  const chartData = records.flatMap((record, idx) => [
    { record: record.name, category: '存储', value: record.cost_summary.storage_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: 'PUT请求', value: record.cost_summary.put_request_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: 'GET请求', value: record.cost_summary.get_request_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: '检索', value: record.cost_summary.retrieval_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: '转换', value: record.cost_summary.lifecycle_cost, color: RECORD_COLORS[idx] },
    { record: record.name, category: '传输', value: record.cost_summary.data_transfer_cost, color: RECORD_COLORS[idx] },
  ]);

  const config = {
    data: chartData,
    xField: 'category',
    yField: 'value',
    seriesField: 'record',
    isGroup: true,
    columnStyle: { radius: [4, 4, 0, 0] },
    label: {
      position: 'top' as const,
      formatter: (datum: { value: number }) => `$${datum.value.toFixed(2)}`,
      style: { fontSize: 10 },
    },
    yAxis: {
      label: { formatter: (v: string) => `$${v}` },
    },
    legend: { position: 'top' as const },
    tooltip: {
      formatter: (datum: { record: string; value: number }) => ({
        name: datum.record,
        value: `$${datum.value.toFixed(4)}`,
      }),
    },
    color: RECORD_COLORS.slice(0, records.length),
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
          const isMax = r.cost_summary.total_cost === maxCost && records.length > 1 && minCost !== maxCost;

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
                  style={{ color: isMin ? '#52c41a' : isMax ? '#ff4d4f' : undefined }}
                >
                  ${formatNumber(r.cost_summary.total_cost, 4)}
                </Text>
              </div>
              <Progress
                percent={percent}
                showInfo={false}
                strokeColor={isMin ? '#52c41a' : RECORD_COLORS[i]}
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
