/**
 * 定价数据表格组件
 *
 * 显示指定区域的 S3 各存储类型定价详情
 */
import React from 'react';
import { Table, Card, Typography, Tag, Row, Col, Divider, Space, Tooltip, Empty } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  SwapOutlined,
  GlobalOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { PricingDetailResponse } from '../../types';

const { Title, Text } = Typography;

interface PricingTableProps {
  pricing: PricingDetailResponse | null;
  loading?: boolean;
}

// 存储类型显示名称映射
const storageClassNames: { [key: string]: string } = {
  STANDARD: 'S3 Standard',
  GLACIER_IR: 'S3 Glacier IR',
  DEEP_ARCHIVE: 'S3 Deep Archive',
};

// 存储类型描述
const storageClassDescriptions: { [key: string]: string } = {
  STANDARD: '适用于频繁访问的数据，毫秒级延迟',
  GLACIER_IR: '适用于需要即时访问的归档数据，毫秒级检索',
  DEEP_ARCHIVE: '适用于长期归档，检索时间 12-48 小时',
};

// 存储类型颜色映射
const storageClassColors: { [key: string]: string } = {
  STANDARD: 'blue',
  GLACIER_IR: 'cyan',
  DEEP_ARCHIVE: 'purple',
};

const PricingTable: React.FC<PricingTableProps> = ({ pricing, loading = false }) => {
  if (!pricing) {
    return (
      <Card loading={loading}>
        <Empty description="请选择区域查看定价信息" />
      </Card>
    );
  }

  // 存储类型定价表格列
  const storageColumns = [
    {
      title: '存储类型',
      dataIndex: 'storageClass',
      key: 'storageClass',
      width: 200,
      render: (value: string) => (
        <Space direction="vertical" size={0}>
          <Tag color={storageClassColors[value] || 'default'}>
            {storageClassNames[value] || value}
          </Tag>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {storageClassDescriptions[value]}
          </Text>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="每 GB 每月存储费用">
          <Space size={4}>
            <DatabaseOutlined />
            存储
          </Space>
        </Tooltip>
      ),
      dataIndex: 'storage_per_gb_month',
      key: 'storage',
      align: 'right' as const,
      render: (value: number) => (
        <Text strong style={{ color: '#1677ff' }}>
          ${value.toFixed(4)}
          <Text type="secondary" style={{ fontSize: 11 }}>/GB-月</Text>
        </Text>
      ),
    },
    {
      title: (
        <Tooltip title="每千次 PUT/POST/LIST 请求费用">
          <Space size={4}>
            <CloudUploadOutlined />
            PUT
          </Space>
        </Tooltip>
      ),
      dataIndex: 'put_per_1000',
      key: 'put',
      align: 'right' as const,
      render: (value: number) => (
        <Text>
          ${value.toFixed(4)}
          <Text type="secondary" style={{ fontSize: 11 }}>/千次</Text>
        </Text>
      ),
    },
    {
      title: (
        <Tooltip title="每千次 GET/SELECT 请求费用">
          <Space size={4}>
            <CloudDownloadOutlined />
            GET
          </Space>
        </Tooltip>
      ),
      dataIndex: 'get_per_1000',
      key: 'get',
      align: 'right' as const,
      render: (value: number) => (
        <Text>
          ${value.toFixed(4)}
          <Text type="secondary" style={{ fontSize: 11 }}>/千次</Text>
        </Text>
      ),
    },
    {
      title: (
        <Tooltip title="每 GB 数据检索费用（仅适用于 Glacier 类型）">
          检索
        </Tooltip>
      ),
      dataIndex: 'retrieval_per_gb',
      key: 'retrieval',
      align: 'right' as const,
      render: (value: number, record: { storageClass: string }) => {
        if (record.storageClass === 'STANDARD') {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Text>
            ${value.toFixed(4)}
            <Text type="secondary" style={{ fontSize: 11 }}>/GB</Text>
          </Text>
        );
      },
    },
    {
      title: (
        <Tooltip title="每千次生命周期转换费用">
          <Space size={4}>
            <SwapOutlined />
            转换
          </Space>
        </Tooltip>
      ),
      dataIndex: 'lifecycle_transition_per_1000',
      key: 'lifecycle',
      align: 'right' as const,
      render: (value: number, record: { storageClass: string }) => {
        if (record.storageClass === 'STANDARD') {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Text>
            ${value.toFixed(4)}
            <Text type="secondary" style={{ fontSize: 11 }}>/千次</Text>
          </Text>
        );
      },
    },
  ];

  // 将定价数据转换为表格数据
  const storageData = Object.entries(pricing.storage_classes).map(([key, value]) => ({
    key,
    storageClass: key,
    ...value,
  }));

  // 数据传输阶梯定价
  const transferTiers = [
    {
      key: '1',
      tier: '前 10 TB',
      range: '0 - 10 TB/月',
      price: pricing.data_transfer.out_first_10tb_per_gb,
    },
    {
      key: '2',
      tier: '10-50 TB',
      range: '10 TB - 50 TB/月',
      price: pricing.data_transfer.out_next_40tb_per_gb,
    },
    {
      key: '3',
      tier: '50-150 TB',
      range: '50 TB - 150 TB/月',
      price: pricing.data_transfer.out_next_100tb_per_gb,
    },
    {
      key: '4',
      tier: '150 TB 以上',
      range: '> 150 TB/月',
      price: pricing.data_transfer.out_over_150tb_per_gb,
    },
  ];

  const transferColumns = [
    {
      title: '流量阶梯',
      dataIndex: 'tier',
      key: 'tier',
      width: 120,
    },
    {
      title: '范围',
      dataIndex: 'range',
      key: 'range',
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      align: 'right' as const,
      render: (value: number) => (
        <Text strong style={{ color: '#1677ff' }}>
          ${value.toFixed(4)}
          <Text type="secondary" style={{ fontSize: 11 }}>/GB</Text>
        </Text>
      ),
    },
  ];

  return (
    <div>
      {/* 区域信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Space>
              <GlobalOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <Title level={5} style={{ margin: 0 }}>
                {pricing.region_name}
              </Title>
              <Tag color="blue">{pricing.region}</Tag>
            </Space>
          </Col>
          <Col>
            <Space split={<Divider type="vertical" />}>
              <Space>
                <DollarOutlined />
                <Text type="secondary">货币: </Text>
                <Text strong>{pricing.currency}</Text>
              </Space>
              <Space>
                <Text type="secondary">最后更新: </Text>
                <Text strong>{pricing.last_updated}</Text>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 存储类型定价 */}
      <Card
        title={
          <Space>
            <DatabaseOutlined />
            存储类型定价
          </Space>
        }
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={storageColumns}
          dataSource={storageData}
          pagination={false}
          loading={loading}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 数据传输定价 */}
      <Card
        title={
          <Space>
            <SwapOutlined />
            数据传输出站定价（阶梯定价）
          </Space>
        }
        styles={{ body: { paddingBottom: 8 } }}
      >
        <Table
          columns={transferColumns}
          dataSource={transferTiers}
          pagination={false}
          size="middle"
        />
        <Divider style={{ margin: '12px 0' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          数据传输入站免费，同区域内传输免费。以上价格为传输至互联网的出站费用。
        </Text>
      </Card>
    </div>
  );
};

export default PricingTable;
