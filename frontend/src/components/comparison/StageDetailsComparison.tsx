/**
 * 分阶段费用明细对比组件
 */
import React from 'react';
import { Tabs, Table, Descriptions, Typography, Tag, Empty } from 'antd';
import type { CalculationRecord, StageCostDetail, CostItemDetail } from '../../types/calculationRecords';
import { RECORD_COLORS, getValueColor } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

// 费用项定义
const COST_ITEMS = [
  { key: 'storage_cost', label: '存储费用' },
  { key: 'put_request_cost', label: 'PUT 请求费用' },
  { key: 'get_request_cost', label: 'GET 请求费用' },
  { key: 'retrieval_cost', label: '检索费用' },
  { key: 'transition_cost', label: '转换费用' },
  { key: 'data_transfer_cost', label: '数据传输费用' },
  { key: 'stage_total', label: '阶段小计', isTotal: true },
];

// 格式化费用项详情（单价 × 用量 = 金额）
const formatCostItemDetail = (item: CostItemDetail | undefined): React.ReactNode => {
  if (!item || item.amount === 0) return <Text type="secondary">-</Text>;
  return (
    <div>
      <div><Text strong>${formatNumber(item.amount, 4)}</Text></div>
      <div style={{ fontSize: 12, color: '#888' }}>
        {formatNumber(item.unit_price, 6)} {item.unit_price_unit} × {formatNumber(item.quantity, 2)} {item.quantity_unit}
      </div>
    </div>
  );
};

const StageDetailsComparison: React.FC<Props> = ({ records }) => {
  // 找出最大阶段数
  const maxStages = Math.max(...records.map((r) => r.stage_details.length));

  if (maxStages === 0) {
    return <Empty description="无阶段费用数据" />;
  }

  // 构建表格列
  const buildColumns = (stageIdx: number) => [
    {
      title: '费用项',
      dataIndex: 'label',
      key: 'label',
      width: 140,
      render: (text: string, row: { isTotal?: boolean }) => (
        <Text strong={row.isTotal}>{text}</Text>
      ),
    },
    ...records.map((record, idx) => {
      const stage = record.stage_details[stageIdx];
      return {
        title: (
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: RECORD_COLORS[idx],
                marginRight: 8,
              }}
            />
            {record.name}
          </div>
        ),
        dataIndex: `value_${idx}`,
        key: `value_${idx}`,
        align: 'right' as const,
        render: (_: unknown, row: { key: string; isTotal?: boolean }) => {
          if (!stage) return <Text type="secondary">-</Text>;

          if (row.key === 'stage_total') {
            const allValues = records
              .map((r) => r.stage_details[stageIdx]?.stage_total)
              .filter((v): v is number => v !== undefined);
            const color = getValueColor(stage.stage_total, allValues);
            return (
              <Text strong style={{ color }}>
                ${formatNumber(stage.stage_total, 4)}
              </Text>
            );
          }

          const costItem = stage[row.key as keyof StageCostDetail] as CostItemDetail | undefined;
          return formatCostItemDetail(costItem);
        },
      };
    }),
  ];

  // 构建表格数据
  const buildDataSource = () =>
    COST_ITEMS.map((item) => ({
      key: item.key,
      label: item.label,
      isTotal: item.isTotal,
    }));

  // Tab 项
  const tabItems = Array.from({ length: maxStages }, (_, stageIdx) => ({
    key: String(stageIdx),
    label: `阶段 ${stageIdx + 1}`,
    children: (
      <div>
        {/* 阶段基本信息 */}
        <Descriptions size="small" column={records.length} bordered style={{ marginBottom: 16 }}>
          {records.map((r, i) => {
            const stage = r.stage_details[stageIdx];
            return (
              <Descriptions.Item
                key={r.record_id}
                label={
                  <span>
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
                  </span>
                }
              >
                {stage ? (
                  <div>
                    <Tag color="blue">{stage.storage_class}</Tag>
                    <span style={{ marginLeft: 8 }}>
                      第 {stage.start_day}-{stage.end_day} 天
                    </span>
                    <span style={{ marginLeft: 8, color: '#888' }}>
                      访问率 {((stage.access_rate ?? 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <Text type="secondary">无此阶段</Text>
                )}
              </Descriptions.Item>
            );
          })}
        </Descriptions>

        {/* 费用明细表格 */}
        <Table
          dataSource={buildDataSource()}
          columns={buildColumns(stageIdx)}
          pagination={false}
          size="small"
          bordered
        />
      </div>
    ),
  }));

  return <Tabs defaultActiveKey="0" items={tabItems} />;
};

export default StageDetailsComparison;
