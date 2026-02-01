/**
 * 增强版费用明细表格
 * 支持单价、用量、阶梯明细展示
 * 定价数据从后端 API 动态获取
 */
import React, { useState } from 'react';
import { Table, Typography, Tag, Spin } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import type {
  CostBreakdown,
  UsageMetrics,
  PricingMetadata as APIPricingMetadata,
  StorageClass,
} from '../../types';
import { usePricing } from '../../hooks/usePricing';

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
  formula?: string;  // 用量计算公式
  monthly: number;
  yearly: number;
  percent: number;
  children?: EnhancedCostItem[];
}

interface CostBreakdownTableProps {
  breakdown: CostBreakdown;
  metrics?: UsageMetrics;
  monthlyTotal: number;
  pricingMetadata?: APIPricingMetadata;
  // 区域和存储类型（用于动态获取定价）
  region: string;
  storageClass: StorageClass;
  // 功能参数（用于显示公式中的具体数值）
  deviceCount?: number;
  retentionDays?: number;
  accessPattern?: number;
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

const CostBreakdownTable: React.FC<CostBreakdownTableProps> = ({
  breakdown,
  metrics,
  monthlyTotal,
  pricingMetadata,
  region,
  storageClass,
  deviceCount,
  retentionDays,
  accessPattern,
  detailedBreakdown,
}) => {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // 计算日数据量（GB）
  const dailyDataGb = metrics?.avg_storage_gb && retentionDays
    ? (metrics.avg_storage_gb / retentionDays).toFixed(1)
    : '-';

  // 计算日分片数
  const dailySegments = metrics?.monthly_puts && deviceCount
    ? Math.round(metrics.monthly_puts / deviceCount / 30)
    : '-';

  // 格式化回看比例为百分比
  const accessPatternPercent = accessPattern !== undefined
    ? `${(accessPattern * 100).toFixed(0)}%`
    : '-';

  // 从 API 动态获取定价数据
  const { data: pricing, isLoading: pricingLoading } = usePricing(region);

  // 获取当前存储类型的定价
  const getStoragePricing = () => {
    if (!pricing) return null;
    return pricing.storage_classes[storageClass];
  };

  // 获取数据传输定价
  const getTransferPrice = () => {
    if (!pricing) return 0;
    return pricing.data_transfer.out_first_10tb_per_gb;
  };

  // 构建数据传输阶梯明细
  const buildDataTransferTiers = (transferGb: number): TierDetail[] => {
    if (!pricing || transferGb <= 0) return [];

    const tierConfigs = [
      { name: '前 10TB', start: 0, end: 10 * 1024, price: pricing.data_transfer.out_first_10tb_per_gb },
      { name: '10-50TB', start: 10 * 1024, end: 50 * 1024, price: pricing.data_transfer.out_next_40tb_per_gb },
      { name: '50-150TB', start: 50 * 1024, end: 150 * 1024, price: pricing.data_transfer.out_next_100tb_per_gb },
      { name: '150TB 以上', start: 150 * 1024, end: Infinity, price: pricing.data_transfer.out_over_150tb_per_gb },
    ];

    let remaining = transferGb;
    return tierConfigs
      .map(tier => {
        const tierCapacity = tier.end - tier.start;
        const quantity = Math.min(remaining, tierCapacity);
        remaining = Math.max(0, remaining - tierCapacity);
        return {
          tierName: tier.name,
          rangeStartGb: tier.start,
          rangeEndGb: tier.end === Infinity ? undefined : tier.end,
          unitPrice: tier.price,
          quantityGb: quantity,
          amount: quantity * tier.price,
        };
      })
      .filter(tier => tier.quantityGb > 0);
  };

  // 构建费用明细数据
  const buildBreakdownData = (): EnhancedCostItem[] => {
    const items: EnhancedCostItem[] = [];
    const storagePricing = getStoragePricing();
    const transferPrice = getTransferPrice();

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
        formula: `${deviceCount || '-'} × ${dailyDataGb}GB × ${retentionDays || '-'}天`,
        monthly: storageTotal,
        yearly: storageTotal * 12,
        percent: (storageTotal / monthlyTotal) * 100,
        children: storageChildren,
      });
    } else {
      // 使用简单的存储费用数据（从 API 获取单价）
      items.push({
        key: 'storage',
        name: '存储费用',
        unitPrice: storagePricing?.storage_per_gb_month,
        unitPriceUnit: 'USD/GB-月',
        quantity: metrics?.avg_storage_gb,
        quantityUnit: 'GB',
        formula: `${deviceCount || '-'} × ${dailyDataGb}GB × ${retentionDays || '-'}天`,
        monthly: breakdown.storage_cost,
        yearly: breakdown.storage_cost * 12,
        percent: (breakdown.storage_cost / monthlyTotal) * 100,
      });
    }

    // PUT 请求费用
    items.push({
      key: 'put',
      name: 'PUT 请求费用',
      unitPrice: storagePricing?.put_per_1000,
      unitPriceUnit: 'USD/千次',
      quantity: metrics ? metrics.monthly_puts / 1000 : undefined,
      quantityUnit: '千次',
      formula: `${deviceCount || '-'} × ${dailySegments} × 30`,
      monthly: breakdown.put_request_cost,
      yearly: breakdown.put_request_cost * 12,
      percent: (breakdown.put_request_cost / monthlyTotal) * 100,
    });

    // GET 请求费用
    items.push({
      key: 'get',
      name: 'GET 请求费用',
      unitPrice: storagePricing?.get_per_1000,
      unitPriceUnit: 'USD/千次',
      quantity: metrics ? metrics.monthly_gets / 1000 : undefined,
      quantityUnit: '千次',
      formula: `PUT × ${accessPatternPercent}`,
      monthly: breakdown.get_request_cost,
      yearly: breakdown.get_request_cost * 12,
      percent: (breakdown.get_request_cost / monthlyTotal) * 100,
    });

    // 检索费用
    if (breakdown.retrieval_cost > 0) {
      items.push({
        key: 'retrieval',
        name: '检索费用',
        unitPrice: storagePricing?.retrieval_per_gb,
        unitPriceUnit: 'USD/GB',
        quantity: metrics?.monthly_retrieval_gb,
        quantityUnit: 'GB',
        formula: `存储量 × ${accessPatternPercent}`,
        monthly: breakdown.retrieval_cost,
        yearly: breakdown.retrieval_cost * 12,
        percent: (breakdown.retrieval_cost / monthlyTotal) * 100,
      });
    }

    // 数据传输费用（带阶梯）
    if (breakdown.data_transfer_cost > 0) {
      // 构建阶梯明细子行：优先使用后端返回的详细数据，否则动态构建
      const tiers = detailedBreakdown?.dataTransferTiers ||
        (metrics?.monthly_transfer_gb ? buildDataTransferTiers(metrics.monthly_transfer_gb) : undefined);

      let tierChildren: EnhancedCostItem[] | undefined;
      if (tiers && tiers.length > 0) {
        tierChildren = tiers.map((tier, index) => ({
          key: `transfer_tier_${index}`,
          name: `└ ${tier.tierName}`,
          unitPrice: tier.unitPrice,
          unitPriceUnit: 'USD/GB',
          quantity: tier.quantityGb,
          quantityUnit: 'GB',
          monthly: tier.amount,
          yearly: tier.amount * 12,
          percent: (tier.amount / monthlyTotal) * 100,
        }));
      }

      // 计算加权平均单价（当有多个阶梯时）
      const avgTransferPrice = tiers && tiers.length > 0 && metrics?.monthly_transfer_gb
        ? tiers.reduce((sum, t) => sum + t.amount, 0) / metrics.monthly_transfer_gb
        : transferPrice;

      items.push({
        key: 'transfer',
        name: '数据传输费用',
        unitPrice: avgTransferPrice,
        unitPriceUnit: 'USD/GB',
        quantity: metrics?.monthly_transfer_gb,
        quantityUnit: 'GB',
        formula: `存储量 × ${accessPatternPercent}`,
        monthly: breakdown.data_transfer_cost,
        yearly: breakdown.data_transfer_cost * 12,
        percent: (breakdown.data_transfer_cost / monthlyTotal) * 100,
        children: tierChildren,
      });
    }

    // 生命周期转换费用
    if (breakdown.lifecycle_cost > 0) {
      items.push({
        key: 'lifecycle',
        name: '生命周期转换费用',
        unitPrice: storagePricing?.lifecycle_transition_per_1000,
        unitPriceUnit: 'USD/千次',
        quantity: metrics ? metrics.monthly_puts / 1000 : undefined,
        quantityUnit: '千次',
        formula: `${deviceCount || '-'} × ${dailySegments} × 30`,
        monthly: breakdown.lifecycle_cost,
        yearly: breakdown.lifecycle_cost * 12,
        percent: (breakdown.lifecycle_cost / monthlyTotal) * 100,
      });
    }

    return items;
  };

  const data = buildBreakdownData();

  const columns = [
    {
      title: '费用类型',
      dataIndex: 'name',
      key: 'name',
      width: 200,
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
      width: 150,
      render: (_: unknown, record: EnhancedCostItem) =>
        record.quantity !== undefined ? (
          <div>
            <div style={{ whiteSpace: 'nowrap' }}>
              {record.quantity.toFixed(2)} {record.quantityUnit}
            </div>
            {record.formula && (
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                {record.formula}
              </div>
            )}
          </div>
        ) : record.formula ? (
          <div>
            <Text type="secondary">-</Text>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {record.formula}
            </div>
          </div>
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

      <Spin spinning={pricingLoading} tip="加载定价数据...">
        <Table
          dataSource={data}
          columns={columns}
          pagination={false}
          size="small"
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            childrenColumnName: 'children',
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
      </Spin>
    </div>
  );
};

export default CostBreakdownTable;
