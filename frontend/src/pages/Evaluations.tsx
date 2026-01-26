/**
 * 评估记录页面
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api/client';
import type { Evaluation } from '../types';

const { Title, Text } = Typography;

const Evaluations: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copyingEval, setCopyingEval] = useState<Evaluation | null>(null);
  const [form] = Form.useForm();
  const [copyForm] = Form.useForm();

  // 搜索和排序状态
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchEvaluations = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const data = await evaluationApi.list({
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setEvaluations(data);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        message.warning('请先登录');
      } else {
        message.error('获取评估记录失败');
      }
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  useEffect(() => {
    fetchEvaluations(searchText);
  }, [fetchEvaluations, searchText]);

  const handleSearch = () => {
    fetchEvaluations(searchText);
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-') as ['created_at' | 'updated_at' | 'name', 'asc' | 'desc'];
    setSortBy(field);
    setSortOrder(order);
  };

  const handleDelete = async (id: string) => {
    try {
      await evaluationApi.delete(id);
      message.success('删除成功');
      fetchEvaluations(searchText);
    } catch {
      message.error('删除失败');
    }
  };

  const handleEdit = (record: Evaluation) => {
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
      fetchEvaluations(searchText);
    } catch {
      message.error('更新失败');
    }
  };

  const handleLoad = (record: Evaluation) => {
    navigate('/calculator', {
      state: {
        loadFromEvaluation: record,
      },
    });
    message.success('已加载评估配置到计算器');
  };

  const handleCopy = (record: Evaluation) => {
    setCopyingEval(record);
    copyForm.setFieldsValue({
      name: `${record.name} - 副本`,
    });
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
      fetchEvaluations(searchText);
    } catch {
      message.error('复制失败');
    }
  };

  const columns = [
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
        <Tag color={record.input_data.technical.storage_class === 'STANDARD' ? 'blue' : 'purple'}>
          {record.input_data.technical.storage_class}
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
            onClick={() => handleLoad(record)}
          >
            加载
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
          >
            复制
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条评估记录吗？"
            onConfirm={() => handleDelete(record.id)}
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

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            评估记录
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/calculator')}>
            新建评估
          </Button>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input.Search
              placeholder="搜索评估记录..."
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
                { value: 'updated_at-desc', label: '最近修改' },
                { value: 'updated_at-asc', label: '最早修改' },
                { value: 'name-asc', label: '名称 A-Z' },
                { value: 'name-desc', label: '名称 Z-A' },
              ]}
            />
          </Col>
        </Row>

        {evaluations.length === 0 && !loading ? (
          <Empty description="暂无评估记录">
            <Button type="primary" onClick={() => navigate('/calculator')}>
              开始评估
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={evaluations}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        )}
      </Card>

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
    </div>
  );
};

export default Evaluations;
