/**
 * 定价数据表格组件
 *
 * 显示指定区域的 S3 各存储类型定价详情
 */
import React from 'react';
import { Table, Card, Typography, Tag, Descriptions, Divider, Space, Tooltip } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  SwapOutlined,
  InfoCircleOutlined,
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
  GLACIER_IR: 'S3 Glacier Instant Retrieval',
  DEEP_ARCHIVE: 'S3 Glacier Deep Archive',
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
        <Text type="secondary">请选择区域查看定价信息</Text>
      </Card>
    );
  }

  // 存储类型定价表格列
  const storageColumns = [
    {
      title: '存储类型',
      dataIndex: 'storageClass',
      key: 'storageClass',
      render: (value: string) => (
        <Tag color={storageClassColors[value] || 'default'}>
          {storageClassNames[value] || value}
        </Tag>
      ),
    },
    {
      title: (
        <Tooltip title="每 GB 每月存储费用">
          <Space>
            <DatabaseOutlined />
            存储费用
            <InfoCircleOutlined style={{ fontSize: 12 }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'storage_per_gb_month',
      key: 'storage',
      render: (value: number) => `$${value.toFixed(4)}/GB-月`,
    },
    {
      title: (
        <Tooltip title="每千次 PUT/POST/LIST 请求费用">
          <Space>
            <CloudUploadOutlined />
            PUT 请求
            <InfoCircleOutlined style={{ fontSize: 12 }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'put_per_1000',
      key: 'put',
      render: (value: number) => `$${value.toFixed(4)}/千次`,
    },
    {
      title: (
        <Tooltip title="每千次 GET/SELECT 请求费用">
          <Space>
            <CloudDownloadOutlined />
            GET 请求
            <InfoCircleOutlined style={{ fontSize: 12 }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'get_per_1000',
      key: 'get',
      render: (value: number) => `$${value.toFixed(4)}/千次`,
    },
    {
      title: (
        <Tooltip title="每 GB 数据检索费用（仅适用于 Glacier 类型）">
          <Space>
            检索费用
            <InfoCircleOutlined style={{ fontSize: 12 }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'retrieval_per_gb',
      key: 'retrieval',
      render: (value: number, record: { storageClass: string }) => {
        if (record.storageClass === 'STANDARD') {
          return <Text type="secondary">-</Text>;
        }
        return `$${value.toFixed(4)}/GB`;
      },
    },
    {
      title: (
        <Tooltip title="每千次生命周期转换费用">
          <Space>
            <SwapOutlined />
            转换费用
            <InfoCircleOutlined style={{ fontSize: 12 }} />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'lifecycle_transition_per_1000',
      key: 'lifecycle',
      render: (value: number, record: { storageClass: string }) => {
        if (record.storageClass === 'STANDARD') {
          return <Text type="secondary">-</Text>;
        }
        return `$${value.toFixed(4)}/千次`;
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
      render: (value: number) => `$${value.toFixed(4)}/GB`,
    },
  ];

  return (
    <div>
      {/* 区域信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions
          title={
            <Space>
              <Title level={5} style={{ margin: 0 }}>
                {pricing.region_name}
              </Title>
              <Tag color="blue">{pricing.region}</Tag>
            </Space>
          }
          column={3}
        >
          <Descriptions.Item label="货币">{pricing.currency}</Descriptions.Item>
          <Descriptions.Item label="最后更新">{pricing.last_updated}</Descriptions.Item>
        </Descriptions>
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
      >
        <Table
          columns={storageColumns}
          dataSource={storageData}
          pagination={false}
          loading={loading}
          size="middle"
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
      >
        <Table
          columns={transferColumns}
          dataSource={transferTiers}
          pagination={false}
          size="middle"
        />
        <Divider />
        <Text type="secondary" style={{ fontSize: 12 }}>
          注：数据传输入站免费，同区域内传输免费。以上价格为传输至互联网的出站费用。
        </Text>
      </Card>
    </div>
  );
};

export default PricingTable;
