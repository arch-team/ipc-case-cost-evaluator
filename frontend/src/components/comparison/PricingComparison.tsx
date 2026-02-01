/**
 * 定价信息对比组件
 */
import React from 'react';
import { Table, Typography } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS, areValuesEqual } from '../../utils/comparisonHelpers';
import { formatNumber } from '../../utils/formatters';

const { Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

interface PricingRow {
  key: string;
  label: string;
  getValue: (r: CalculationRecord) => string;
}

const PricingComparison: React.FC<Props> = ({ records }) => {
  // 定价参数
  const pricingParams: PricingRow[] = [
    {
      key: 'region',
      label: 'AWS 区域',
      getValue: (r) =>
        `${r.pricing_snapshot.region_name} (${r.pricing_snapshot.region})`,
    },
    {
      key: 'discount',
      label: '折扣',
      getValue: (r) => `${r.input_params.pricing.discount_percent}%`,
    },
    {
      key: 'snapshot_date',
      label: '定价日期',
      getValue: (r) => r.pricing_snapshot.snapshot_date,
    },
    {
      key: 'storage_price_std',
      label: 'S3 Standard 存储单价',
      getValue: (r) => {
        const price = r.pricing_snapshot.storage_pricing.STANDARD?.storage_per_gb;
        return price !== undefined ? `$${formatNumber(price, 6)}/GB` : '-';
      },
    },
    {
      key: 'storage_price_glacier',
      label: 'Glacier IR 存储单价',
      getValue: (r) => {
        const price = r.pricing_snapshot.storage_pricing.GLACIER_IR?.storage_per_gb;
        return price !== undefined ? `$${formatNumber(price, 6)}/GB` : '-';
      },
    },
    {
      key: 'put_price_std',
      label: 'S3 Standard PUT 单价',
      getValue: (r) => {
        const price = r.pricing_snapshot.storage_pricing.STANDARD?.put_per_1000;
        return price !== undefined ? `$${formatNumber(price, 6)}/千次` : '-';
      },
    },
    {
      key: 'get_price_std',
      label: 'S3 Standard GET 单价',
      getValue: (r) => {
        const price = r.pricing_snapshot.storage_pricing.STANDARD?.get_per_1000;
        return price !== undefined ? `$${formatNumber(price, 6)}/千次` : '-';
      },
    },
  ];

  // 构建表格列
  const columns = [
    {
      title: '定价项',
      dataIndex: 'label',
      key: 'label',
      width: 180,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
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
      align: 'center' as const,
      render: (value: string, row: { values: string[] }) => {
        const isDifferent = !areValuesEqual(row.values);
        return (
          <Text
            style={{
              backgroundColor: isDifferent ? '#fff7e6' : undefined,
              padding: isDifferent ? '2px 8px' : undefined,
              borderRadius: isDifferent ? 4 : undefined,
            }}
          >
            {value}
          </Text>
        );
      },
    })),
  ];

  // 构建表格数据
  const dataSource = pricingParams.map((param) => {
    const values = records.map((r) => param.getValue(r));
    return {
      key: param.key,
      label: param.label,
      values,
      ...records.reduce(
        (acc, record, idx) => ({
          ...acc,
          [`value_${idx}`]: param.getValue(record),
        }),
        {}
      ),
    };
  });

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
      bordered
    />
  );
};

export default PricingComparison;
