/**
 * 评估记录页面
 */
import React, { useState, useEffect } from 'react';
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
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
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
  const [form] = Form.useForm();

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const data = await evaluationApi.list();
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
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await evaluationApi.delete(id);
      message.success('删除成功');
      fetchEvaluations();
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
      fetchEvaluations();
    } catch {
      message.error('更新失败');
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
      render: (_: unknown, record: Evaluation) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/evaluations/${record.id}`)}
          >
            查看
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除这条评估记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
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
    </div>
  );
};

export default Evaluations;
