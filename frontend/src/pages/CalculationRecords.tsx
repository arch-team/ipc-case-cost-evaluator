/**
 * 核算记录列表页面
 *
 * 用户可以查看和管理自己的核算记录历史，包括：
 * - 分页表格展示记录列表
 * - 按名称搜索
 * - 排序（创建时间、名称、总成本）
 * - 查看详情、删除操作
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Typography,
  Tag,
  Empty,
  Input,
  Select,
  Row,
  Col,
  Modal,
  Skeleton,
  Alert,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { calculationRecordApi } from '../api/calculationRecords';
import type {
  CalculationRecordSummary,
  StorageStrategy,
} from '../types/calculationRecords';
import { AuthContext } from '../contexts/AuthContext';
import { formatNumber } from '../utils/formatters';

const { Title, Text } = Typography;
const { confirm } = Modal;

// 存储策略显示名称
const storageStrategyNames: Record<StorageStrategy, string> = {
  single_standard: 'S3 Standard',
  single_glacier_ir: 'Glacier IR',
  lifecycle_std_glacier: 'Standard → Glacier',
  lifecycle_multi_stage: '多阶段生命周期',
};

// 存储策略标签颜色
const storageStrategyColors: Record<StorageStrategy, string> = {
  single_standard: 'blue',
  single_glacier_ir: 'cyan',
  lifecycle_std_glacier: 'purple',
  lifecycle_multi_stage: 'magenta',
};

const CalculationRecords: React.FC = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const isLoggedIn = !!authContext?.user;

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CalculationRecordSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 分页和排序状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'total_cost'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 删除操作状态
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 获取记录列表
  const fetchRecords = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await calculationRecordApi.list({
        page,
        page_size: pageSize,
        search: searchText || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setRecords(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = axiosError.response?.status;

      if (status === 401) {
        message.warning('请先登录');
        navigate('/settings');
      } else {
        const detail = axiosError.response?.data?.detail || '获取核算记录失败';
        setError(detail);
        message.error(detail);
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, page, pageSize, searchText, sortBy, sortOrder, navigate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 搜索处理
  const handleSearch = () => {
    setPage(1);
    fetchRecords();
  };

  // 排序处理
  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-') as [
      'created_at' | 'name' | 'total_cost',
      'asc' | 'desc'
    ];
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  // 删除记录
  const handleDelete = (record: CalculationRecordSummary) => {
    confirm({
      title: '确定删除此核算记录？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            记录名称：<Text strong>{record.name}</Text>
          </p>
          <p>删除后将无法恢复。</p>
        </div>
      ),
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeletingId(record.record_id);
        try {
          await calculationRecordApi.delete(record.record_id);
          message.success('删除成功');
          fetchRecords();
        } catch {
          message.error('删除失败');
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // 表格分页配置
  const handleTableChange = (pagination: { current?: number; pageSize?: number }) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '存储策略',
      dataIndex: 'storage_strategy',
      key: 'storage_strategy',
      width: 180,
      render: (strategy: StorageStrategy) => (
        <Tag color={storageStrategyColors[strategy]}>
          {storageStrategyNames[strategy]}
        </Tag>
      ),
    },
    {
      title: '月度成本',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 140,
      align: 'right' as const,
      render: (cost: number) => (
        <Text strong style={{ color: '#1890ff' }}>
          ${formatNumber(cost, 4)}
        </Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: CalculationRecordSummary) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/calculation-records/${record.record_id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deletingId === record.record_id}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 未登录提示
  if (!isLoggedIn) {
    return (
      <Card>
        <Alert
          message="请先登录"
          description="您需要登录后才能查看核算记录列表。"
          type="warning"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/settings')}>
              去登录
            </Button>
          }
        />
      </Card>
    );
  }

  // 加载骨架屏
  if (loading && records.length === 0) {
    return (
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            核算记录
          </Title>
        </div>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  // 错误状态
  if (error && records.length === 0) {
    return (
      <Card>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={() => fetchRecords()}>重试</Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      {/* 标题栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          核算记录
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/detailed-calculation')}
        >
          新建核算
        </Button>
      </div>

      {/* 搜索和排序 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Input.Search
            placeholder="搜索核算记录..."
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ maxWidth: 400 }}
          />
        </Col>
        <Col>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onChange={handleSortChange}
            style={{ width: 150 }}
            options={[
              { value: 'created_at-desc', label: '最新创建' },
              { value: 'created_at-asc', label: '最早创建' },
              { value: 'total_cost-desc', label: '成本最高' },
              { value: 'total_cost-asc', label: '成本最低' },
              { value: 'name-asc', label: '名称 A-Z' },
              { value: 'name-desc', label: '名称 Z-A' },
            ]}
          />
        </Col>
      </Row>

      {/* 记录列表 */}
      {records.length === 0 && !loading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无核算记录"
        >
          <Button type="primary" onClick={() => navigate('/detailed-calculation')}>
            开始核算
          </Button>
        </Empty>
      ) : (
        <Table
          dataSource={records}
          columns={columns}
          rowKey="record_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showTotal: (t) => `共 ${t} 条记录`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          onChange={handleTableChange}
        />
      )}
    </Card>
  );
};

export default CalculationRecords;
