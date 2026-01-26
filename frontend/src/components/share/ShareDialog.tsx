/**
 * 分享对话框
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Radio,
  Select,
  Button,
  Input,
  List,
  Typography,
  message,
  Space,
  Tooltip,
  Spin,
  Empty,
  Popconfirm,
} from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  LinkOutlined,
  ShareAltOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { shareApi } from '../../api/client';
import type { ShareResponse } from '../../types';

const { Text } = Typography;

interface Props {
  visible: boolean;
  evaluationId: string;
  evaluationName?: string;
  onClose: () => void;
}

const ShareDialog: React.FC<Props> = ({
  visible,
  evaluationId,
  evaluationName,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [shares, setShares] = useState<ShareResponse[]>([]);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadShares = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await shareApi.list(evaluationId);
      setShares(data.shares || []);
    } catch (error) {
      console.error('加载分享列表失败', error);
    } finally {
      setListLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    if (visible && evaluationId) {
      loadShares();
      setNewShareUrl(null);
      form.resetFields();
    }
  }, [visible, evaluationId, form, loadShares]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const response = await shareApi.create(evaluationId, {
        permission: values.permission,
        expires_days: values.expires_days,
      });
      setNewShareUrl(response.share_url);
      loadShares();
      message.success('分享链接已创建');
    } catch (error) {
      message.error('创建分享失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      message.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  const handleDelete = async (token: string) => {
    try {
      await shareApi.delete(evaluationId, token);
      loadShares();
      message.success('分享已删除');
    } catch {
      message.error('删除失败');
    }
  };

  const getShareUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/shared/${token}`;
  };

  const formatExpireDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          分享评估
          {evaluationName && <Text type="secondary">- {evaluationName}</Text>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ permission: 'VIEW', expires_days: 7 }}
        style={{ marginBottom: 24 }}
      >
        <Form.Item name="permission" label="分享权限">
          <Radio.Group>
            <Radio.Button value="VIEW">仅查看</Radio.Button>
            <Radio.Button value="DUPLICATE">可复制</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="expires_days" label="有效期">
          <Select style={{ width: 200 }}>
            <Select.Option value={1}>1 天</Select.Option>
            <Select.Option value={7}>7 天</Select.Option>
            <Select.Option value={30}>30 天</Select.Option>
            <Select.Option value={90}>90 天</Select.Option>
            <Select.Option value={365}>1 年</Select.Option>
          </Select>
        </Form.Item>

        <Button
          type="primary"
          icon={<LinkOutlined />}
          onClick={handleCreate}
          loading={loading}
        >
          创建分享链接
        </Button>
      </Form>

      {newShareUrl && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 8,
          }}
        >
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            分享链接已创建
          </Text>
          <Input.Search
            value={newShareUrl}
            readOnly
            enterButton={
              <Button icon={copied ? <CheckOutlined /> : <CopyOutlined />}>
                {copied ? '已复制' : '复制'}
              </Button>
            }
            onSearch={() => handleCopy(newShareUrl)}
          />
        </div>
      )}

      <div>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          已有分享链接 ({shares.length})
        </Text>

        {listLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : shares.length === 0 ? (
          <Empty
            description="暂无分享链接"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            size="small"
            dataSource={shares}
            renderItem={(share) => (
              <List.Item
                actions={[
                  <Tooltip title="复制链接" key="copy">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(getShareUrl(share.share_token))}
                    />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="确定删除此分享链接？"
                    onConfirm={() => handleDelete(share.share_token)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Tooltip title="删除">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      />
                    </Tooltip>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text>
                        {share.permission === 'VIEW' ? '仅查看' : '可复制'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {share.share_token.slice(0, 8)}...
                      </Text>
                    </Space>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      过期时间: {formatExpireDate(share.expires_at)}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Modal>
  );
};

export default ShareDialog;
