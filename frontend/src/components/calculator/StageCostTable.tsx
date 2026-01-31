/**
 * 分阶段费用表格组件
 *
 * 展示分阶段的费用明细，每阶段包含：
 * - 时间范围和存储类型
 * - 存储费用、请求费用、检索费用、转换费用
 * - 每项费用显示：单价 × 用量 = 金额
 */
import React from 'react';
import { Table, Typography, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { StageCostDetail, CostItemDetail, TierDetailSnapshot } from '../../types/calculationRecords';
import { formatNumber } from '../../utils/formatters';
import {
  getStorageClassLabel,
  getStorageClassColor,
  STORAGE_CLASS_LABELS_SHORT,
} from '../../constants/storageClasses';

const { Text } = Typography;

interface StageCostTableProps {
  stages: StageCostDetail[];
  compact?: boolean; // 紧凑模式
  dataTransferCost?: number; // 数据传输费用（全局费用，不按阶段分）
  dataTransferTiers?: TierDetailSnapshot[]; // 数据传输阶梯明细
  totalCostWithTransfer?: number; // 包含传输费用的总成本
}

// 存储类型简短名称映射（从统一数据源获取）
const storageClassNames = STORAGE_CLASS_LABELS_SHORT;

// 格式化费用公式显示
const formatCostFormula = (item: CostItemDetail): string => {
  if (item.amount === 0) return '-';
  return `${formatNumber(item.unit_price, 6)} ${item.unit_price_unit} × ${formatNumber(item.quantity, 4)} ${item.quantity_unit} = $${formatNumber(item.amount, 4)}`;
};

// 费用项详情展示组件
const CostItemDisplay: React.FC<{ item: CostItemDetail }> = ({ item }) => {
  if (item.amount === 0) {
    return <Text type="secondary">-</Text>;
  }

  return (
    <Tooltip
      title={
        <div>
          <div>单价: {formatNumber(item.unit_price, 6)} {item.unit_price_unit}</div>
          <div>用量: {formatNumber(item.quantity, 4)} {item.quantity_unit}</div>
          <div>金额: ${formatNumber(item.amount, 4)}</div>
        </div>
      }
    >
      <Space size={4}>
        <Text strong style={{ color: '#1890ff' }}>
          ${formatNumber(item.amount, 4)}
        </Text>
        <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
      </Space>
    </Tooltip>
  );
};

const StageCostTable: React.FC<StageCostTableProps> = ({
  stages,
  compact = false,
  dataTransferCost,
  dataTransferTiers,
  totalCostWithTransfer,
}) => {
  // 表格列定义
  const columns: ColumnsType<StageCostDetail> = [
    {
      title: '阶段',
      dataIndex: 'stage_index',
      key: 'stage',
      width: 140,
      render: (_, record) => {
        const stageName = stages.length === 1
          ? `全周期`
          : `阶段 ${record.stage_index + 1}`;
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{stageName}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              第 {record.start_day} - {record.end_day} 天
            </Text>
          </div>
        );
      },
    },
    {
      title: '存储类型',
      dataIndex: 'storage_class',
      key: 'storage_class',
      width: 120,
      render: (value: string) => (
        <Tag color={getStorageClassColor(value, 'ant')}>
          {getStorageClassLabel(value, 'short')}
        </Tag>
      ),
    },
    {
      title: '访问比例',
      dataIndex: 'access_rate',
      key: 'access_rate',
      width: 90,
      render: (value: number | undefined) => {
        if (value === undefined || value === 0) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Text style={{ color: '#722ed1' }}>
            {(value * 100).toFixed(1)}%
          </Text>
        );
      },
    },
    {
      title: '存储费用',
      dataIndex: 'storage_cost',
      key: 'storage_cost',
      width: 120,
      render: (item: CostItemDetail) => <CostItemDisplay item={item} />,
    },
    {
      title: 'PUT 请求',
      dataIndex: 'put_request_cost',
      key: 'put_request_cost',
      width: 120,
      render: (item: CostItemDetail) => <CostItemDisplay item={item} />,
    },
    {
      title: 'GET 请求',
      dataIndex: 'get_request_cost',
      key: 'get_request_cost',
      width: 120,
      render: (item: CostItemDetail) => <CostItemDisplay item={item} />,
    },
    {
      title: '检索费用',
      dataIndex: 'retrieval_cost',
      key: 'retrieval_cost',
      width: 120,
      render: (item: CostItemDetail | null) =>
        item ? <CostItemDisplay item={item} /> : <Text type="secondary">-</Text>,
    },
    {
      title: '转换费用',
      dataIndex: 'transition_cost',
      key: 'transition_cost',
      width: 120,
      render: (item: CostItemDetail | null) =>
        item ? <CostItemDisplay item={item} /> : <Text type="secondary">-</Text>,
    },
    {
      title: '阶段小计',
      dataIndex: 'stage_total',
      key: 'stage_total',
      width: 100,
      align: 'right',
      render: (value: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          ${formatNumber(value, 4)}
        </Text>
      ),
    },
  ];

  // 紧凑模式使用简化列
  const compactColumns: ColumnsType<StageCostDetail> = [
    {
      title: '阶段',
      key: 'stage',
      width: 100,
      render: (_, record) => {
        const stageName = stages.length === 1
          ? `全周期`
          : `阶段 ${record.stage_index + 1}`;
        return (
          <div>
            <div style={{ fontSize: 13 }}>{stageName}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {storageClassNames[record.storage_class] || record.storage_class}
            </Text>
          </div>
        );
      },
    },
    {
      title: '时间',
      key: 'duration',
      width: 80,
      render: (_, record) => (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.duration_days} 天
          </Text>
          {record.access_rate !== undefined && record.access_rate > 0 && (
            <div style={{ fontSize: 11, color: '#722ed1' }}>
              访问: {(record.access_rate * 100).toFixed(1)}%
            </div>
          )}
        </div>
      ),
    },
    {
      title: '费用明细',
      key: 'costs',
      render: (_, record) => {
        const items = [
          { label: '存储', value: record.storage_cost.amount },
          { label: 'PUT', value: record.put_request_cost.amount },
          { label: 'GET', value: record.get_request_cost.amount },
          record.retrieval_cost && { label: '检索', value: record.retrieval_cost.amount },
          record.transition_cost && { label: '转换', value: record.transition_cost.amount },
        ].filter(Boolean);

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {items.map((item, idx) => item && (
              <Text key={idx} type="secondary" style={{ fontSize: 11 }}>
                {item.label}: ${formatNumber(item.value, 2)}
              </Text>
            ))}
          </div>
        );
      },
    },
    {
      title: '小计',
      dataIndex: 'stage_total',
      key: 'stage_total',
      width: 80,
      align: 'right',
      render: (value: number) => (
        <Text strong style={{ fontSize: 13, color: '#52c41a' }}>
          ${formatNumber(value, 2)}
        </Text>
      ),
    },
  ];

  // 计算总费用
  const totalCost = stages.reduce((sum, stage) => sum + stage.stage_total, 0);

  // 展开的阶段详情
  const expandedRowRender = (record: StageCostDetail) => (
    <div style={{ padding: '12px 16px', background: '#fafafa' }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {/* 存储费用详情 */}
        <div>
          <Text type="secondary">存储费用: </Text>
          <Text>{formatCostFormula(record.storage_cost)}</Text>
        </div>

        {/* PUT 请求费用详情 */}
        <div>
          <Text type="secondary">PUT 请求: </Text>
          <Text>{formatCostFormula(record.put_request_cost)}</Text>
        </div>

        {/* GET 请求费用详情 */}
        <div>
          <Text type="secondary">GET 请求: </Text>
          <Text>{formatCostFormula(record.get_request_cost)}</Text>
        </div>

        {/* 检索费用详情 */}
        {record.retrieval_cost && (
          <div>
            <Text type="secondary">检索费用: </Text>
            <Text>{formatCostFormula(record.retrieval_cost)}</Text>
          </div>
        )}

        {/* 转换费用详情 */}
        {record.transition_cost && (
          <div>
            <Text type="secondary">转换费用: </Text>
            <Text>{formatCostFormula(record.transition_cost)}</Text>
          </div>
        )}
      </Space>
    </div>
  );

  return (
    <div className="stage-cost-table">
      <Table
        columns={compact ? compactColumns : columns}
        dataSource={stages}
        rowKey="stage_index"
        pagination={false}
        size={compact ? 'small' : 'middle'}
        expandable={
          compact
            ? undefined
            : {
                expandedRowRender,
                expandRowByClick: true,
              }
        }
        footer={() => (
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ marginRight: 16 }}>
                阶段费用小计:
              </Text>
              <Text style={{ fontSize: 14 }}>
                ${formatNumber(totalCost, 4)}
              </Text>
            </div>
            {dataTransferCost !== undefined && dataTransferCost > 0 && (
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ marginRight: 16 }}>
                  数据传输出站 (DTO):
                </Text>
                <Text style={{ fontSize: 14 }}>
                  ${formatNumber(dataTransferCost, 4)}
                </Text>
                {/* DTO 阶梯明细 */}
                {dataTransferTiers && dataTransferTiers.length > 0 && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4, textAlign: 'left', paddingLeft: 16 }}>
                    {dataTransferTiers.map((tier, idx) => (
                      <div key={idx} style={{ marginBottom: 2 }}>
                        └─ {tier.tier_name}: {formatNumber(tier.quantity_gb, 2)} GB × ${formatNumber(tier.unit_price, 4)}/GB = ${formatNumber(tier.amount, 4)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {totalCostWithTransfer !== undefined ? (
              <div style={{ borderTop: '1px dashed #d9d9d9', paddingTop: 8, marginTop: 4 }}>
                <Text type="secondary" style={{ marginRight: 16 }}>
                  月度总费用:
                </Text>
                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                  ${formatNumber(totalCostWithTransfer, 4)}
                </Text>
              </div>
            ) : (
              <div>
                <Text type="secondary" style={{ marginRight: 16 }}>
                  月度总费用:
                </Text>
                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                  ${formatNumber(totalCost, 4)}
                </Text>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
};

export default StageCostTable;
