/**
 * 增强版费用明细表格
 * 支持单价、用量、阶梯明细展示
 */
import React, { useState } from 'react';
import { Table, Typography, Tag, Space, Tooltip } from 'antd';
import {
  InfoCircleOutlined,
  DownOutlined,
  RightOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import type {
  CostBreakdown,
  UsageMetrics,
  PricingMetadata as APIPricingMetadata,
} from '../../types';

const { Text } = Typography;

// 内部阶梯明细类型（camelCase）
interface TierDetail {
  tierName: string;
  rangeStartGb: number;
  rangeEndGb?: number;
  unitPrice: number;
  quantityGb: number;
  amount: number;
}

// 增强型费用项类型
interface EnhancedCostItem {
  key: string;
  name: string;
  unitPrice?: number;
  unitPriceUnit?: string;
  quantity?: number;
  quantityUnit?: string;
  monthly: number;
  yearly: number;
  percent: number;
  tiers?: TierDetail[];
  children?: EnhancedCostItem[];
}

interface CostBreakdownTableProps {
  breakdown: CostBreakdown;
  metrics?: UsageMetrics;
  monthlyTotal: number;
  pricingMetadata?: APIPricingMetadata;
  // 可选的详细明细数据（来自后端增强 API）
  detailedBreakdown?: {
    storageCosts?: Array<{
      name: string;
      unitPrice: number;
      unitPriceUnit: string;
      quantity: number;
      quantityUnit: string;
      amount: number;
    }>;
    dataTransferTiers?: TierDetail[];
  };
}

// 默认单价配置（当后端不提供详细数据时使用）
const DEFAULT_PRICING = {
  STANDARD: {
    storage: 0.025,
    put: 0.0047,
    get: 0.00037,
  },
  GLACIER_IR: {
    storage: 0.004,
    put: 0.02,
    get: 0.01,
    retrieval: 0.03,
    lifecycle: 0.02,
  },
};

const CostBreakdownTable: React.FC<CostBreakdownTableProps> = ({
  breakdown,
  metrics,
  monthlyTotal,
  pricingMetadata,
  detailedBreakdown,
}) => {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // 构建费用明细数据
  const buildBreakdownData = (): EnhancedCostItem[] => {
    const items: EnhancedCostItem[] = [];

    // 存储费用
    if (detailedBreakdown?.storageCosts && detailedBreakdown.storageCosts.length > 0) {
      // 使用详细的存储费用数据
      const storageTotal = detailedBreakdown.storageCosts.reduce((sum, c) => sum + c.amount, 0);
      const storageChildren = detailedBreakdown.storageCosts.map((cost, index) => ({
        key: `storage_${index}`,
        name: cost.name,
        unitPrice: cost.unitPrice,
        unitPriceUnit: cost.unitPriceUnit,
        quantity: cost.quantity,
        quantityUnit: cost.quantityUnit,
        monthly: cost.amount,
        yearly: cost.amount * 12,
        percent: (cost.amount / monthlyTotal) * 100,
      }));

      items.push({
        key: 'storage',
        name: '存储费用',
        monthly: storageTotal,
        yearly: storageTotal * 12,
        percent: (storageTotal / monthlyTotal) * 100,
        children: storageChildren,
      });
    } else {
      // 使用简单的存储费用数据
      items.push({
        key: 'storage',
        name: '存储费用',
        unitPrice: DEFAULT_PRICING.STANDARD.storage,
        unitPriceUnit: 'USD/GB-月',
        quantity: metrics?.avg_storage_gb,
        quantityUnit: 'GB',
        monthly: breakdown.storage_cost,
        yearly: breakdown.storage_cost * 12,
        percent: (breakdown.storage_cost / monthlyTotal) * 100,
      });
    }

    // PUT 请求费用
    items.push({
      key: 'put',
      name: 'PUT 请求费用',
      unitPrice: DEFAULT_PRICING.STANDARD.put,
      unitPriceUnit: 'USD/千次',
      quantity: metrics ? metrics.monthly_puts / 1000 : undefined,
      quantityUnit: '千次',
      monthly: breakdown.put_request_cost,
      yearly: breakdown.put_request_cost * 12,
      percent: (breakdown.put_request_cost / monthlyTotal) * 100,
    });

    // GET 请求费用
    items.push({
      key: 'get',
      name: 'GET 请求费用',
      unitPrice: DEFAULT_PRICING.STANDARD.get,
      unitPriceUnit: 'USD/千次',
      quantity: metrics ? metrics.monthly_gets / 1000 : undefined,
      quantityUnit: '千次',
      monthly: breakdown.get_request_cost,
      yearly: breakdown.get_request_cost * 12,
      percent: (breakdown.get_request_cost / monthlyTotal) * 100,
    });

    // 检索费用
    if (breakdown.retrieval_cost > 0) {
      items.push({
        key: 'retrieval',
        name: '检索费用',
        unitPrice: DEFAULT_PRICING.GLACIER_IR.retrieval,
        unitPriceUnit: 'USD/GB',
        quantity: metrics?.monthly_retrieval_gb,
        quantityUnit: 'GB',
        monthly: breakdown.retrieval_cost,
        yearly: breakdown.retrieval_cost * 12,
        percent: (breakdown.retrieval_cost / monthlyTotal) * 100,
      });
    }

    // 数据传输费用（带阶梯）
    if (breakdown.data_transfer_cost > 0) {
      const transferItem: EnhancedCostItem = {
        key: 'transfer',
        name: '数据传输费用',
        unitPrice: 0.114,
        unitPriceUnit: 'USD/GB',
        quantity: metrics?.monthly_transfer_gb,
        quantityUnit: 'GB',
        monthly: breakdown.data_transfer_cost,
        yearly: breakdown.data_transfer_cost * 12,
        percent: (breakdown.data_transfer_cost / monthlyTotal) * 100,
      };

      // 添加阶梯明细
      if (detailedBreakdown?.dataTransferTiers) {
        transferItem.tiers = detailedBreakdown.dataTransferTiers;
      } else if (metrics?.monthly_transfer_gb) {
        // 生成默认阶梯明细
        transferItem.tiers = [
          {
            tierName: '前 10TB',
            rangeStartGb: 0,
            rangeEndGb: 10240,
            unitPrice: 0.114,
            quantityGb: Math.min(metrics.monthly_transfer_gb, 10240),
            amount: Math.min(metrics.monthly_transfer_gb, 10240) * 0.114,
          },
        ];
      }

      items.push(transferItem);
    }

    // 生命周期转换费用
    if (breakdown.lifecycle_cost > 0) {
      items.push({
        key: 'lifecycle',
        name: '生命周期转换费用',
        unitPrice: DEFAULT_PRICING.GLACIER_IR.lifecycle,
        unitPriceUnit: 'USD/千次',
        quantity: metrics ? metrics.monthly_puts / 1000 : undefined,
        quantityUnit: '千次',
        monthly: breakdown.lifecycle_cost,
        yearly: breakdown.lifecycle_cost * 12,
        percent: (breakdown.lifecycle_cost / monthlyTotal) * 100,
      });
    }

    return items;
  };

  const data = buildBreakdownData();

  // 渲染阶梯明细
  const renderTierDetails = (tiers: TierDetail[]) => (
    <div style={{ padding: '8px 16px', background: '#fafafa' }}>
      <Text strong style={{ marginBottom: 8, display: 'block' }}>
        阶梯定价明细
      </Text>
      <Table
        size="small"
        pagination={false}
        dataSource={tiers.map((t, i) => ({ ...t, key: i }))}
        columns={[
          {
            title: '阶梯',
            dataIndex: 'tierName',
            width: 120,
          },
          {
            title: '范围',
            key: 'range',
            width: 150,
            render: (_, record) =>
              record.rangeEndGb
                ? `${record.rangeStartGb} - ${record.rangeEndGb} GB`
                : `${record.rangeStartGb}+ GB`,
          },
          {
            title: '单价',
            dataIndex: 'unitPrice',
            width: 100,
            render: (val: number) => `$${val.toFixed(4)}/GB`,
          },
          {
            title: '用量',
            dataIndex: 'quantityGb',
            width: 100,
            render: (val: number) => `${val.toFixed(2)} GB`,
          },
          {
            title: '费用',
            dataIndex: 'amount',
            width: 100,
            render: (val: number) => `$${val.toFixed(2)}`,
          },
        ]}
      />
    </div>
  );

  const columns = [
    {
      title: '费用类型',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: EnhancedCostItem) => (
        <Space>
          {record.children && (
            expandedRowKeys.includes(record.key) ? <DownOutlined /> : <RightOutlined />
          )}
          {record.tiers && record.tiers.length > 0 && (
            <Tooltip title="点击查看阶梯明细">
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
          {name}
        </Space>
      ),
    },
    {
      title: '单价',
      key: 'unitPrice',
      width: 140,
      render: (_: unknown, record: EnhancedCostItem) =>
        record.unitPrice !== undefined ? (
          <Text type="secondary">
            ${record.unitPrice.toFixed(4)}/{record.unitPriceUnit?.replace('USD/', '')}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '用量',
      key: 'quantity',
      width: 120,
      render: (_: unknown, record: EnhancedCostItem) =>
        record.quantity !== undefined ? (
          <Text>
            {record.quantity.toFixed(2)} {record.quantityUnit}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '月度费用',
      dataIndex: 'monthly',
      key: 'monthly',
      width: 120,
      align: 'right' as const,
      render: (val: number) => <Text strong>${val.toFixed(2)}</Text>,
    },
    {
      title: '年度费用',
      dataIndex: 'yearly',
      key: 'yearly',
      width: 120,
      align: 'right' as const,
      render: (val: number) => `$${val.toFixed(2)}`,
    },
    {
      title: '占比',
      dataIndex: 'percent',
      key: 'percent',
      width: 80,
      align: 'right' as const,
      render: (val: number) => (
        <Tag color={val > 50 ? 'red' : val > 20 ? 'orange' : 'default'}>
          {val.toFixed(1)}%
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* 定价来源标识 */}
      {pricingMetadata && (
        <div
          style={{
            marginBottom: 16,
            padding: '8px 12px',
            background: pricingMetadata.is_fallback ? '#fff7e6' : '#e6f7ff',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CloudServerOutlined />
          <Text type="secondary">
            定价来源: {pricingMetadata.source === 'AWS_API' ? 'AWS Pricing API' : '本地数据'}
            {' | '}
            区域: {pricingMetadata.region}
            {' | '}
            更新时间: {new Date(pricingMetadata.updated_at).toLocaleString()}
          </Text>
          {pricingMetadata.is_fallback && (
            <Tag color="warning">回退数据</Tag>
          )}
        </div>
      )}

      <Table
        dataSource={data}
        columns={columns}
        pagination={false}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
          expandedRowRender: (record) =>
            record.tiers && record.tiers.length > 0
              ? renderTierDetails(record.tiers)
              : null,
          rowExpandable: (record) =>
            Boolean(
              (record.tiers && record.tiers.length > 0) ||
              (record.children && record.children.length > 0)
            ),
        }}
        summary={() => (
          <Table.Summary.Row style={{ background: '#fafafa' }}>
            <Table.Summary.Cell index={0} colSpan={3}>
              <Text strong>合计</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Text strong>${monthlyTotal.toFixed(2)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">
              <Text strong>${(monthlyTotal * 12).toFixed(2)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">
              <Text strong>100%</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
};

export default CostBreakdownTable;
