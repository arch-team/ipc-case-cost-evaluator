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
import {
  STORAGE_CLASS_METADATA,
  STORAGE_CLASS_LABELS,
  STORAGE_CLASS_ANT_COLORS,
  getStorageClassHint,
} from '../../constants/storageClasses';

const { Title, Text } = Typography;

interface PricingTableProps {
  pricing: PricingDetailResponse | null;
  loading?: boolean;
  comparisonSlot?: React.ReactNode;
}

/**
 * 存储类型扩展信息
 */
interface StorageClassExtendedInfo {
  chineseName: string;
  useCase: string;
  minDuration: string;
  minSize: string;
}

/**
 * 存储类型扩展信息映射
 * 将特定于定价表的额外信息集中管理
 */
const STORAGE_CLASS_EXTENDED_INFO: Record<string, StorageClassExtendedInfo> = {
  STANDARD: {
    chineseName: '标准存储',
    useCase: '热数据、网站内容、移动应用',
    minDuration: '-',
    minSize: '-',
  },
  INTELLIGENT_TIERING: {
    chineseName: '智能分层',
    useCase: '访问模式变化的数据',
    minDuration: '-',
    minSize: '-',
  },
  STANDARD_IA: {
    chineseName: '标准低频访问',
    useCase: '备份、灾难恢复',
    minDuration: '30 天',
    minSize: '128 KB',
  },
  ONEZONE_IA: {
    chineseName: '单区低频访问',
    useCase: '可重建数据、次要备份',
    minDuration: '30 天',
    minSize: '128 KB',
  },
  GLACIER_IR: {
    chineseName: '即时检索归档',
    useCase: '医疗影像、媒体资产',
    minDuration: '90 天',
    minSize: '128 KB',
  },
  GLACIER_FR: {
    chineseName: '灵活检索归档',
    useCase: '归档、合规数据',
    minDuration: '90 天',
    minSize: '-',
  },
  DEEP_ARCHIVE: {
    chineseName: '深度归档',
    useCase: '长期保留、合规归档',
    minDuration: '180 天',
    minSize: '-',
  },
};

/**
 * 获取存储类型的扩展信息
 */
function getExtendedInfo(storageClass: string): StorageClassExtendedInfo {
  return STORAGE_CLASS_EXTENDED_INFO[storageClass] || {
    chineseName: storageClass,
    useCase: '-',
    minDuration: '-',
    minSize: '-',
  };
}

/**
 * 格式化价格显示
 */
function formatPrice(value: number, unit: string, isStrong = false): React.ReactNode {
  const priceText = (
    <>
      ${value.toFixed(4)}
      <Text type="secondary" style={{ fontSize: 11 }}>{unit}</Text>
    </>
  );

  if (isStrong) {
    return (
      <Text strong style={{ color: '#1677ff', whiteSpace: 'nowrap' }}>
        {priceText}
      </Text>
    );
  }

  return <Text style={{ whiteSpace: 'nowrap' }}>{priceText}</Text>;
}

/**
 * 格式化可选价格（0 值显示为 "-"）
 */
function formatOptionalPrice(value: number, unit: string): React.ReactNode {
  if (value === 0) {
    return <Text type="secondary">-</Text>;
  }
  return formatPrice(value, unit);
}

/**
 * 创建带 Tooltip 的表格标题
 */
function createTooltipTitle(tooltip: string, icon?: React.ReactNode, text?: string): React.ReactNode {
  const content = icon && text ? (
    <Space size={4}>
      {icon}
      {text}
    </Space>
  ) : (
    <span style={{ whiteSpace: 'nowrap' }}>{text || tooltip}</span>
  );

  return <Tooltip title={tooltip}>{content}</Tooltip>;
}

const PricingTable: React.FC<PricingTableProps> = ({ pricing, loading = false, comparisonSlot }) => {
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
      width: 180,
      fixed: 'left' as const,
      render: (value: string) => (
        <Tag color={STORAGE_CLASS_ANT_COLORS[value] || 'default'}>
          {STORAGE_CLASS_LABELS[value] || value}
        </Tag>
      ),
    },
    {
      title: '中文名称',
      dataIndex: 'storageClass',
      key: 'chineseName',
      width: 120,
      render: (value: string) => {
        const info = getExtendedInfo(value);
        return (
          <Text strong style={{ fontSize: 14, color: '#262626' }}>
            {info.chineseName}
          </Text>
        );
      },
    },
    {
      title: '描述',
      dataIndex: 'storageClass',
      key: 'description',
      width: 200,
      render: (value: string) => (
        <Text style={{ color: '#595959', whiteSpace: 'nowrap' }}>
          {getStorageClassHint(value)}
        </Text>
      ),
    },
    {
      title: '应用场景',
      dataIndex: 'storageClass',
      key: 'useCase',
      width: 200,
      render: (value: string) => {
        const info = getExtendedInfo(value);
        return (
          <Tag color="default" style={{ margin: 0 }}>
            {info.useCase}
          </Tag>
        );
      },
    },
    {
      title: createTooltipTitle(
        '删除对象前的最小存储时间，提前删除仍按此时长计费',
        undefined,
        '最小存储期限'
      ),
      dataIndex: 'storageClass',
      key: 'minDuration',
      width: 120,
      align: 'center' as const,
      render: (value: string) => {
        const info = getExtendedInfo(value);
        return <Text>{info.minDuration}</Text>;
      },
    },
    {
      title: createTooltipTitle(
        '小于此大小的对象按此大小计费',
        undefined,
        '最小计费大小'
      ),
      dataIndex: 'storageClass',
      key: 'minSize',
      width: 120,
      align: 'center' as const,
      render: (value: string) => {
        const info = getExtendedInfo(value);
        return <Text>{info.minSize}</Text>;
      },
    },
    {
      title: createTooltipTitle(
        '每 GB 每月存储费用',
        <DatabaseOutlined />,
        '存储'
      ),
      dataIndex: 'storage_per_gb_month',
      key: 'storage',
      width: 150,
      align: 'right' as const,
      render: (value: number, record: { storageClass: string }) => {
        const priceNode = formatPrice(value, '/GB-月', true);
        // S3 Intelligent-Tiering 显示的是 Frequent Access tier 价格，添加备注说明
        if (record.storageClass === 'INTELLIGENT_TIERING') {
          return (
            <Tooltip title="显示的是 Frequent Access tier（默认层级）价格。对象会根据访问模式自动移动到更低成本的层级。">
              <span style={{ cursor: 'help' }}>
                {priceNode}
                <Text type="secondary" style={{ fontSize: 10, marginLeft: 2 }}>*</Text>
              </span>
            </Tooltip>
          );
        }
        return priceNode;
      },
    },
    {
      title: createTooltipTitle(
        '每千次 PUT/POST/LIST 请求费用',
        <CloudUploadOutlined />,
        'PUT'
      ),
      dataIndex: 'put_per_1000',
      key: 'put',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatPrice(value, '/千次'),
    },
    {
      title: createTooltipTitle(
        '每千次 GET/SELECT 请求费用',
        <CloudDownloadOutlined />,
        'GET'
      ),
      dataIndex: 'get_per_1000',
      key: 'get',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatPrice(value, '/千次'),
    },
    {
      title: createTooltipTitle(
        '每 GB 数据检索费用（仅适用于 Glacier 类型）',
        undefined,
        '检索'
      ),
      dataIndex: 'retrieval_per_gb',
      key: 'retrieval',
      width: 110,
      align: 'right' as const,
      render: (value: number) => formatOptionalPrice(value, '/GB'),
    },
    {
      title: createTooltipTitle(
        '每千次生命周期转换费用',
        <SwapOutlined />,
        '转换'
      ),
      dataIndex: 'lifecycle_transition_per_1000',
      key: 'lifecycle',
      width: 120,
      align: 'right' as const,
      render: (value: number) => formatOptionalPrice(value, '/千次'),
    },
  ];

  // 将定价数据转换为表格数据，按预定义顺序排列
  const storageData = Object.entries(pricing.storage_classes)
    .map(([key, value]) => ({
      key,
      storageClass: key,
      ...value,
    }))
    .sort((a, b) => {
      const indexA = STORAGE_CLASS_METADATA.findIndex(m => m.value === a.storageClass);
      const indexB = STORAGE_CLASS_METADATA.findIndex(m => m.value === b.storageClass);
      // 如果不在排序列表中，放到最后
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  // 数据传输阶梯定价配置
  const transferTierConfig = [
    { tier: '前 10 TB', range: '0 - 10 TB/月', field: 'out_first_10tb_per_gb' },
    { tier: '10-50 TB', range: '10 TB - 50 TB/月', field: 'out_next_40tb_per_gb' },
    { tier: '50-150 TB', range: '50 TB - 150 TB/月', field: 'out_next_100tb_per_gb' },
    { tier: '150 TB 以上', range: '> 150 TB/月', field: 'out_over_150tb_per_gb' },
  ];

  // 生成数据传输阶梯定价数据
  const transferTiers = transferTierConfig.map((config, index) => ({
    key: String(index + 1),
    tier: config.tier,
    range: config.range,
    price: pricing.data_transfer[config.field as keyof typeof pricing.data_transfer] as number,
  }));

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
      render: (value: number) => formatPrice(value, '/GB', true),
    },
  ];

  // 渲染区域信息卡片
  const renderRegionCard = () => (
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
  );

  // 渲染存储类型定价表格
  const renderStoragePricingCard = () => (
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
        size="large"
        scroll={{ x: 1600 }}
        style={{
          '--ant-table-cell-padding-block': '16px',
          '--ant-table-cell-padding-inline': '16px',
        } as React.CSSProperties}
      />
    </Card>
  );

  // 渲染数据传输定价卡片
  const renderTransferPricingCard = () => (
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
  );

  return (
    <div>
      {renderRegionCard()}
      {renderStoragePricingCard()}
      {comparisonSlot}
      {renderTransferPricingCard()}
    </div>
  );
};

export default PricingTable;
