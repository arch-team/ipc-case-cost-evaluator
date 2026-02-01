/**
 * 历史记录页面 - 统一管理所有保存的评估记录
 *
 * 合并原「核算记录」和「评估记录」，通过 Tab 或标签区分记录类型：
 * - 详细评估记录：新版核算系统保存的记录
 * - 旧版评估：原评估系统保存的记录（兼容）
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
  Checkbox,
  Tooltip,
  Tabs,
  Form,
  Popconfirm,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  HistoryOutlined,
  EditOutlined,
  CopyOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calculationRecordApi } from '../api/calculationRecords';
import { evaluationApi } from '../api/client';
import type {
  CalculationRecordSummary,
  StorageStrategy,
} from '../types/calculationRecords';
import type { Evaluation } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { formatNumber } from '../utils/formatters';
import { handleApiError } from '../utils/errors';
import { encodeIdList } from '../utils/urlHelpers';
import {
  STORAGE_STRATEGY_NAMES,
  STORAGE_STRATEGY_COLORS,
} from '../constants/storageStrategies';
import { getStorageClassLabel, getStorageClassColor } from '../constants/storageClasses';

const { Title, Text } = Typography;
const { confirm } = Modal;

// Tab 类型
type RecordTabKey = 'detailed' | 'legacy';

// 存储策略显示名称
const storageStrategyNames = STORAGE_STRATEGY_NAMES;
const storageStrategyColors = STORAGE_STRATEGY_COLORS;

const HistoryRecords: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authContext = useContext(AuthContext);
  const isLoggedIn = !!authContext?.user;

  // 从 URL 获取当前 Tab
  const activeTab = (searchParams.get('type') || 'detailed') as RecordTabKey;

  // ========== 详细评估记录状态 ==========
  const [detailedLoading, setDetailedLoading] = useState(true);
  const [detailedRecords, setDetailedRecords] = useState<CalculationRecordSummary[]>([]);
  const [detailedTotal, setDetailedTotal] = useState(0);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [detailedPage, setDetailedPage] = useState(1);
  const [detailedPageSize, setDetailedPageSize] = useState(10);
  const [detailedSearchText, setDetailedSearchText] = useState('');
  const [detailedSortBy, setDetailedSortBy] = useState<'created_at' | 'name' | 'total_cost'>('created_at');
  const [detailedSortOrder, setDetailedSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingDetailedId, setDeletingDetailedId] = useState<string | null>(null);
  const [selectedDetailedIds, setSelectedDetailedIds] = useState<string[]>([]);

  // ========== 旧版评估记录状态 ==========
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyRecords, setLegacyRecords] = useState<Evaluation[]>([]);
  const [legacySearchText, setLegacySearchText] = useState('');
  const [legacySortBy, setLegacySortBy] = useState<'created_at' | 'updated_at' | 'name'>('created_at');
  const [legacySortOrder, setLegacySortOrder] = useState<'asc' | 'desc'>('desc');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copyingEval, setCopyingEval] = useState<Evaluation | null>(null);
  const [form] = Form.useForm();
  const [copyForm] = Form.useForm();

  // Tab 切换处理
  const handleTabChange = (key: string) => {
    setSearchParams({ type: key });
  };

  // ========== 详细评估记录操作 ==========
  const fetchDetailedRecords = useCallback(async () => {
    if (!isLoggedIn) {
      setDetailedLoading(false);
      return;
    }

    setDetailedLoading(true);
    setDetailedError(null);

    try {
      const response = await calculationRecordApi.list({
        page: detailedPage,
        page_size: detailedPageSize,
        search: detailedSearchText || undefined,
        sort_by: detailedSortBy,
        sort_order: detailedSortOrder,
      });

      setDetailedRecords(response.items);
      setDetailedTotal(response.total);
    } catch (err: unknown) {
      const detail = handleApiError(err, '获取核算记录失败', navigate);
      setDetailedError(detail);
    } finally {
      setDetailedLoading(false);
    }
  }, [isLoggedIn, detailedPage, detailedPageSize, detailedSearchText, detailedSortBy, detailedSortOrder, navigate]);

  useEffect(() => {
    if (activeTab === 'detailed') {
      fetchDetailedRecords();
    }
  }, [activeTab, fetchDetailedRecords]);

  const handleDetailedSearch = () => {
    setDetailedPage(1);
    fetchDetailedRecords();
  };

  const handleDetailedSortChange = (value: string) => {
    const [field, order] = value.split('-') as ['created_at' | 'name' | 'total_cost', 'asc' | 'desc'];
    setDetailedSortBy(field);
    setDetailedSortOrder(order);
    setDetailedPage(1);
  };

  const handleDeleteDetailed = (record: CalculationRecordSummary) => {
    confirm({
      title: '确定删除此核算记录？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>记录名称：<Text strong>{record.name}</Text></p>
          <p>删除后将无法恢复。</p>
        </div>
      ),
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeletingDetailedId(record.record_id);
        try {
          await calculationRecordApi.delete(record.record_id);
          message.success('删除成功');
          fetchDetailedRecords();
        } catch {
          message.error('删除失败');
        } finally {
          setDeletingDetailedId(null);
        }
      },
    });
  };

  const handleSelectDetailed = (recordId: string, checked: boolean) => {
    if (checked) {
      if (selectedDetailedIds.length < 4) {
        setSelectedDetailedIds([...selectedDetailedIds, recordId]);
      }
    } else {
      setSelectedDetailedIds(selectedDetailedIds.filter((id) => id !== recordId));
    }
  };

  const handleCompareDetailed = () => {
    if (selectedDetailedIds.length >= 2 && selectedDetailedIds.length <= 4) {
      navigate(`/calculation-records/comparison?ids=${encodeIdList(selectedDetailedIds)}`);
    }
  };

  const handleClearDetailedSelection = () => {
    setSelectedDetailedIds([]);
  };

  const handleDetailedTableChange = (pagination: { current?: number; pageSize?: number }) => {
    if (pagination.current) setDetailedPage(pagination.current);
    if (pagination.pageSize) setDetailedPageSize(pagination.pageSize);
  };

  // ========== 旧版评估记录操作 ==========
  const fetchLegacyRecords = useCallback(async (search?: string) => {
    setLegacyLoading(true);
    try {
      const data = await evaluationApi.list({
        search: search || undefined,
        sort_by: legacySortBy,
        sort_order: legacySortOrder,
      });
      setLegacyRecords(data);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        message.warning('请先登录');
      } else {
        message.error('获取评估记录失败');
      }
    } finally {
      setLegacyLoading(false);
    }
  }, [legacySortBy, legacySortOrder]);

  useEffect(() => {
    if (activeTab === 'legacy' && isLoggedIn) {
      fetchLegacyRecords(legacySearchText);
    }
  }, [activeTab, isLoggedIn, fetchLegacyRecords, legacySearchText]);

  const handleLegacySearch = () => {
    fetchLegacyRecords(legacySearchText);
  };

  const handleLegacySortChange = (value: string) => {
    const [field, order] = value.split('-') as ['created_at' | 'updated_at' | 'name', 'asc' | 'desc'];
    setLegacySortBy(field);
    setLegacySortOrder(order);
  };

  const handleDeleteLegacy = async (id: string) => {
    try {
      await evaluationApi.delete(id);
      message.success('删除成功');
      fetchLegacyRecords(legacySearchText);
    } catch {
      message.error('删除失败');
    }
  };

  const handleEditLegacy = (record: Evaluation) => {
    setEditingEval(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    if (!editingEval) return;
    try {
      const values = await form.validateFields();
      await evaluationApi.update(editingEval.id, values);
      message.success('更新成功');
      setEditModalVisible(false);
      fetchLegacyRecords(legacySearchText);
    } catch {
      message.error('更新失败');
    }
  };

  const handleLoadLegacy = (record: Evaluation) => {
    navigate('/cost-analysis?tab=quick', {
      state: { loadFromEvaluation: record },
    });
    message.success('已加载评估配置到计算器');
  };

  const handleCopyLegacy = (record: Evaluation) => {
    setCopyingEval(record);
    copyForm.setFieldsValue({ name: `${record.name} - 副本` });
    setCopyModalVisible(true);
  };

  const handleCopySubmit = async () => {
    if (!copyingEval) return;
    try {
      const values = await copyForm.validateFields();
      await evaluationApi.duplicate(copyingEval.id, values.name);
      message.success('复制成功');
      setCopyModalVisible(false);
      setCopyingEval(null);
      copyForm.resetFields();
      fetchLegacyRecords(legacySearchText);
    } catch {
      message.error('复制失败');
    }
  };

  // ========== 表格列定义 ==========
  const detailedColumns = [
    {
      title: '',
      key: 'selection',
      width: 50,
      render: (_: unknown, record: CalculationRecordSummary) => (
        <Tooltip
          title={
            selectedDetailedIds.length >= 4 && !selectedDetailedIds.includes(record.record_id)
              ? '最多选择 4 条记录'
              : undefined
          }
        >
          <Checkbox
            checked={selectedDetailedIds.includes(record.record_id)}
            onChange={(e) => handleSelectDetailed(record.record_id, e.target.checked)}
            disabled={selectedDetailedIds.length >= 4 && !selectedDetailedIds.includes(record.record_id)}
          />
        </Tooltip>
      ),
    },
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
            onClick={() => navigate(`/calculation-records/${encodeURIComponent(record.record_id)}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deletingDetailedId === record.record_id}
            onClick={() => handleDeleteDetailed(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const legacyColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Evaluation) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '设备数量',
      key: 'device_count',
      render: (_: unknown, record: Evaluation) => (
        <span>{record.input_data.functional.device_count} 台</span>
      ),
    },
    {
      title: '存储类型',
      key: 'storage_class',
      render: (_: unknown, record: Evaluation) => (
        <Tag color={getStorageClassColor(record.input_data.technical.storage_class, 'ant')}>
          {getStorageClassLabel(record.input_data.technical.storage_class, 'short')}
        </Tag>
      ),
    },
    {
      title: '月度费用',
      key: 'monthly_cost',
      render: (_: unknown, record: Evaluation) => (
        <Text strong>${record.result.monthly_total.toFixed(2)}</Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 320,
      render: (_: unknown, record: Evaluation) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/evaluations/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleLoadLegacy(record)}
          >
            加载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopyLegacy(record)}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditLegacy(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条评估记录吗？"
            onConfirm={() => handleDeleteLegacy(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
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
          description="您需要登录后才能查看历史记录。"
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

  // 渲染详细评估记录内容
  const renderDetailedContent = () => {
    if (detailedLoading && detailedRecords.length === 0) {
      return <Skeleton active paragraph={{ rows: 6 }} />;
    }

    if (detailedError && detailedRecords.length === 0) {
      return (
        <Alert
          message="加载失败"
          description={detailedError}
          type="error"
          showIcon
          action={<Button onClick={() => fetchDetailedRecords()}>重试</Button>}
        />
      );
    }

    return (
      <>
        {/* 搜索和排序 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input.Search
              placeholder="搜索核算记录..."
              allowClear
              enterButton={<SearchOutlined />}
              value={detailedSearchText}
              onChange={(e) => setDetailedSearchText(e.target.value)}
              onSearch={handleDetailedSearch}
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Select
              value={`${detailedSortBy}-${detailedSortOrder}`}
              onChange={handleDetailedSortChange}
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
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<SwapOutlined />}
                disabled={selectedDetailedIds.length < 2}
                onClick={handleCompareDetailed}
              >
                对比 {selectedDetailedIds.length > 0 && `(${selectedDetailedIds.length})`}
              </Button>
              {selectedDetailedIds.length > 0 && (
                <Button onClick={handleClearDetailedSelection}>清除选择</Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* 记录列表 */}
        {detailedRecords.length === 0 && !detailedLoading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无核算记录">
            <Button type="primary" onClick={() => navigate('/cost-analysis?tab=detailed')}>
              开始核算
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={detailedRecords}
            columns={detailedColumns}
            rowKey="record_id"
            loading={detailedLoading}
            pagination={{
              current: detailedPage,
              pageSize: detailedPageSize,
              total: detailedTotal,
              showTotal: (t) => `共 ${t} 条记录`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
            }}
            onChange={handleDetailedTableChange}
          />
        )}
      </>
    );
  };

  // 渲染旧版评估记录内容
  const renderLegacyContent = () => {
    return (
      <>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input.Search
              placeholder="搜索评估记录..."
              allowClear
              enterButton={<SearchOutlined />}
              value={legacySearchText}
              onChange={(e) => setLegacySearchText(e.target.value)}
              onSearch={handleLegacySearch}
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Select
              value={`${legacySortBy}-${legacySortOrder}`}
              onChange={handleLegacySortChange}
              style={{ width: 150 }}
              options={[
                { value: 'created_at-desc', label: '最新创建' },
                { value: 'created_at-asc', label: '最早创建' },
                { value: 'updated_at-desc', label: '最近修改' },
                { value: 'updated_at-asc', label: '最早修改' },
                { value: 'name-asc', label: '名称 A-Z' },
                { value: 'name-desc', label: '名称 Z-A' },
              ]}
            />
          </Col>
        </Row>

        {legacyRecords.length === 0 && !legacyLoading ? (
          <Empty description="暂无旧版评估记录">
            <Button type="primary" onClick={() => navigate('/cost-analysis?tab=quick')}>
              开始评估
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={legacyRecords}
            columns={legacyColumns}
            rowKey="id"
            loading={legacyLoading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        )}
      </>
    );
  };

  // Tab 项配置
  const tabItems = [
    {
      key: 'detailed',
      label: (
        <span>
          <FileTextOutlined />
          <span style={{ marginLeft: 8 }}>详细评估记录</span>
        </span>
      ),
      children: renderDetailedContent(),
    },
    {
      key: 'legacy',
      label: (
        <span>
          <HistoryOutlined />
          <span style={{ marginLeft: 8 }}>旧版评估</span>
        </span>
      ),
      children: renderLegacyContent(),
    },
  ];

  return (
    <Card>
      {/* 标题栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>
          <HistoryOutlined style={{ marginRight: 8 }} />
          历史记录
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/cost-analysis?tab=detailed')}
        >
          新建评估
        </Button>
      </div>

      {/* Tab 切换 */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
      />

      {/* 编辑旧版评估对话框 */}
      <Modal
        title="编辑评估记录"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 复制旧版评估对话框 */}
      <Modal
        title="复制评估记录"
        open={copyModalVisible}
        onOk={handleCopySubmit}
        onCancel={() => {
          setCopyModalVisible(false);
          setCopyingEval(null);
          copyForm.resetFields();
        }}
        okText="复制"
        cancelText="取消"
      >
        <Form form={copyForm} layout="vertical">
          <Form.Item
            name="name"
            label="新评估名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="输入新评估的名称" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default HistoryRecords;
