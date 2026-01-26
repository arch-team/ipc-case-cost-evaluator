/**
 * 分享链接对话框
 */
import React, { useState } from 'react';
import { Modal, Form, Radio, Input, Button, Space, Typography, message, Alert } from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { SharePermission, ShareResponse } from '../../types';
import { shareApi } from '../../api/client';

const { Text } = Typography;

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  evaluationId?: string;
  isLoggedIn: boolean;
  onNeedSave?: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onClose,
  evaluationId,
  isLoggedIn,
  onNeedSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [expiresDays, setExpiresDays] = useState<number>(7);
  const [permission, setPermission] = useState<SharePermission>('VIEW');
  const [shareResult, setShareResult] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    if (!evaluationId) {
      message.warning('请先保存评估记录');
      onNeedSave?.();
      return;
    }

    setLoading(true);
    try {
      const result = await shareApi.create(evaluationId, {
        permission,
        expires_days: expiresDays,
      });
      setShareResult(result);
      message.success('分享链接已生成');
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        message.error('请先登录');
      } else {
        message.error('生成分享链接失败');
      }
      console.error('分享错误:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareResult?.share_url) return;

    try {
      await navigator.clipboard.writeText(shareResult.share_url);
      setCopied(true);
      message.success('链接已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  const handleClose = () => {
    setShareResult(null);
    setCopied(false);
    onClose();
  };

  // 格式化过期日期
  const formatExpiresAt = (expiresAt: string) => {
    return new Date(expiresAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined style={{ color: 'var(--color-primary)' }} />
          生成分享链接
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={
        shareResult
          ? [
              <Button key="close" onClick={handleClose}>
                关闭
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                取消
              </Button>,
              <Button
                key="generate"
                type="primary"
                icon={<LinkOutlined />}
                loading={loading}
                onClick={handleGenerateLink}
                disabled={!isLoggedIn || !evaluationId}
              >
                生成链接
              </Button>,
            ]
      }
      width={480}
    >
      {!isLoggedIn && (
        <Alert
          type="warning"
          message="请先登录后再使用分享功能"
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {!evaluationId && isLoggedIn && (
        <Alert
          type="info"
          message="请先保存评估记录后再分享"
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      {!shareResult ? (
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="链接有效期">
            <Radio.Group value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)}>
              <Radio.Button value={1}>1 天</Radio.Button>
              <Radio.Button value={7}>
                7 天 <Text type="secondary" style={{ fontSize: 12 }}>(推荐)</Text>
              </Radio.Button>
              <Radio.Button value={30}>30 天</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="访问权限">
            <Radio.Group value={permission} onChange={(e) => setPermission(e.target.value)}>
              <Space direction="vertical">
                <Radio value="VIEW">
                  <Space direction="vertical" size={0}>
                    <Text>仅查看</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      访问者只能查看评估结果（推荐）
                    </Text>
                  </Space>
                </Radio>
                <Radio value="DUPLICATE">
                  <Space direction="vertical" size={0}>
                    <Text>可复制参数</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      访问者可以复制参数到新评估
                    </Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Form>
      ) : (
        <div style={{ marginTop: 16 }}>
          <Form.Item label="分享链接">
            <Input.Group compact style={{ display: 'flex' }}>
              <Input
                value={shareResult.share_url}
                readOnly
                style={{ flex: 1 }}
                addonBefore={<LinkOutlined />}
              />
              <Button
                type={copied ? 'primary' : 'default'}
                icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                onClick={handleCopy}
              >
                {copied ? '已复制' : '复制'}
              </Button>
            </Input.Group>
          </Form.Item>

          <Alert
            type="success"
            icon={<CheckCircleOutlined />}
            message={`链接已生成，有效期至 ${formatExpiresAt(shareResult.expires_at)}`}
            style={{ marginTop: 16 }}
          />
        </div>
      )}
    </Modal>
  );
};

export default ShareDialog;
