/**
 * 定价快照展示组件
 *
 * 展示定价数据快照，包括：
 * - 快照日期、区域、货币
 * - 存储类型定价表格 (每 GB、PUT/GET 请求单价)
 * - 数据传输阶梯定价
 */
import React from 'react';
import { Table, Typography, Row, Col, Card, Tag, Descriptions } from 'antd';
import {
  CloudOutlined,
  SwapOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type {
  PricingSnapshot,
  StorageClassPricing,
  DataTransferTier,
} from '../../types/calculationRecords';
import {
  STORAGE_CLASS_LABELS,
  STORAGE_CLASS_ANT_COLORS,
} from '../../constants/storageClasses';

const { Text } = Typography;

interface PricingSnapshotDisplayProps {
  snapshot: PricingSnapshot;
}

// 存储类型显示名称（从统一数据源获取）
const storageClassNames = STORAGE_CLASS_LABELS;

// 存储类型标签颜色（从统一数据源获取）
const storageClassColors = STORAGE_CLASS_ANT_COLORS;

// 格式化价格（保留足够精度）
const formatPrice = (price: number | undefined, unit: string): string => {
  if (price === undefined || price === null) {
    return '-';
  }
  // 小于 0.01 的价格显示更多小数位
  if (price < 0.01 && price > 0) {
    return `$${price.toFixed(6)}/${unit}`;
  }
  return `$${price.toFixed(4)}/${unit}`;
};

const PricingSnapshotDisplay: React.FC<PricingSnapshotDisplayProps> = ({
  snapshot,
}) => {
  // 转换存储定价数据为表格数据源
  const storagePricingData = Object.entries(snapshot.storage_pricing).map(
    ([storageClass, pricing]: [string, StorageClassPricing]) => ({
      key: storageClass,
      storageClass,
      storagePerGb: pricing.storage_per_gb,
      putPer1000: pricing.put_per_1000,
      getPer1000: pricing.get_per_1000,
      retrievalPerGb: pricing.retrieval_per_gb,
      transitionPer1000: pricing.transition_per_1000,
    })
  );

  // 存储定价表格列定义
  const storagePricingColumns = [
    {
      title: '存储类型',
      dataIndex: 'storageClass',
      key: 'storageClass',
      render: (storageClass: string) => (
        <Tag color={storageClassColors[storageClass] || 'default'}>
          {storageClassNames[storageClass] || storageClass}
        </Tag>
      ),
    },
    {
      title: '存储单价',
      dataIndex: 'storagePerGb',
      key: 'storagePerGb',
      align: 'right' as const,
      render: (price: number) => formatPrice(price, 'GB/月'),
    },
    {
      title: 'PUT 请求',
      dataIndex: 'putPer1000',
      key: 'putPer1000',
      align: 'right' as const,
      render: (price: number) => formatPrice(price, '1K请求'),
    },
    {
      title: 'GET 请求',
      dataIndex: 'getPer1000',
      key: 'getPer1000',
      align: 'right' as const,
      render: (price: number) => formatPrice(price, '1K请求'),
    },
    {
      title: '数据检索',
      dataIndex: 'retrievalPerGb',
      key: 'retrievalPerGb',
      align: 'right' as const,
      render: (price: number | undefined) =>
        price !== undefined ? formatPrice(price, 'GB') : '-',
    },
    {
      title: '生命周期转换',
      dataIndex: 'transitionPer1000',
      key: 'transitionPer1000',
      align: 'right' as const,
      render: (price: number | undefined) =>
        price !== undefined ? formatPrice(price, '1K请求') : '-',
    },
  ];

  // 数据传输定价表格列定义
  const transferPricingColumns = [
    {
      title: '层级',
      dataIndex: 'tier_name',
      key: 'tier_name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '起始量',
      dataIndex: 'start_gb',
      key: 'start_gb',
      align: 'right' as const,
      render: (gb: number) => `${gb.toLocaleString()} GB`,
    },
    {
      title: '结束量',
      dataIndex: 'end_gb',
      key: 'end_gb',
      align: 'right' as const,
      render: (gb: number | undefined) =>
        gb !== undefined ? `${gb.toLocaleString()} GB` : '无限',
    },
    {
      title: '单价',
      dataIndex: 'price_per_gb',
      key: 'price_per_gb',
      align: 'right' as const,
      render: (price: number) => formatPrice(price, 'GB'),
    },
  ];

  return (
    <div>
      {/* 快照基本信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
          <Descriptions.Item
            label={
              <span>
                <CalendarOutlined style={{ marginRight: 4 }} />
                快照日期
              </span>
            }
          >
            <Text strong>
              {new Date(snapshot.snapshot_date).toLocaleDateString('zh-CN')}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="区域">
            <Text code>{snapshot.region}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="区域名称">
            {snapshot.region_name}
          </Descriptions.Item>
          <Descriptions.Item label="货币">
            <Tag color="gold">{snapshot.currency}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 存储定价 */}
        <Col xs={24}>
          <Card
            size="small"
            title={
              <span>
                <CloudOutlined style={{ marginRight: 8 }} />
                存储定价
              </span>
            }
            bordered={false}
          >
            <Table
              dataSource={storagePricingData}
              columns={storagePricingColumns}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        {/* 数据传输定价 */}
        {snapshot.data_transfer_tiers && snapshot.data_transfer_tiers.length > 0 && (
          <Col xs={24}>
            <Card
              size="small"
              title={
                <span>
                  <SwapOutlined style={{ marginRight: 8 }} />
                  数据传输定价（出站到互联网）
                </span>
              }
              bordered={false}
            >
              <Table
                dataSource={snapshot.data_transfer_tiers.map(
                  (tier: DataTransferTier, index: number) => ({
                    ...tier,
                    key: index,
                  })
                )}
                columns={transferPricingColumns}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default PricingSnapshotDisplay;
