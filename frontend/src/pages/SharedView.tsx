/**
 * 分享查看页面
 * 通过分享链接访问的只读评估结果展示
 */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  Typography,
  Spin,
  Result,
  Descriptions,
  Statistic,
  Row,
  Col,
  Button,
  Tag,
  Divider,
  Space,
  Alert,
} from 'antd';
import {
  DollarOutlined,
  ClockCircleOutlined,
  ShareAltOutlined,
  CopyOutlined,
  EyeOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import type { SharedEvaluation, StorageClass } from '../types';
import { shareApi } from '../api/client';
import CostBreakdownTable from '../components/calculator/CostBreakdownTable';

const { Title, Text } = Typography;

const SharedView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SharedEvaluation | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedEvaluation(token);
    }
  }, [token]);

  const loadSharedEvaluation = async (shareToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await shareApi.get(shareToken);
      setEvaluation(data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        setError('分享链接不存在或已过期');
      } else {
        setError('加载分享内容失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 格式化创建日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取录像模式标签
  const getRecordingModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      event_triggered: '事件触发',
      continuous: '全天候录像',
      scheduled: '定时录像',
    };
    return labels[mode] || mode;
  };

  // 获取视频质量标签
  const getVideoQualityLabel = (quality: string) => {
    const labels: Record<string, string> = {
      '720p': '720P (高清)',
      '1080p': '1080P (全高清)',
      '2k': '2K (超清)',
      '4k': '4K (超高清)',
    };
    return labels[quality] || quality;
  };

  // 获取存储类型标签
  const getStorageClassLabel = (storageClass: string) => {
    const labels: Record<string, string> = {
      STANDARD: 'S3 Standard',
      GLACIER_IR: 'S3 Glacier IR',
    };
    return labels[storageClass] || storageClass;
  };

  if (loading) {
    return (
      <div className="shared-view-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="shared-view-error">
        <Result
          status="404"
          title="无法访问"
          subTitle={error || '分享内容不存在'}
          extra={
            <Link to="/">
              <Button type="primary" icon={<HomeOutlined />}>
                返回首页
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { input_data, result } = evaluation;
  const functional = input_data.functional;
  const technical = input_data.technical;
  const pricing = input_data.pricing;

  return (
    <div className="shared-view-page">
      {/* 只读模式提示 */}
      <Alert
        message="只读模式"
        description="您正在通过分享链接查看此评估结果，无法进行修改或删除操作。如需创建自己的评估，请点击右侧按钮。"
        type="info"
        showIcon
        icon={<EyeOutlined />}
        action={
          <Link to="/calculator">
            <Button type="primary" size="small">
              创建新评估
            </Button>
          </Link>
        }
        style={{ marginBottom: 0, borderRadius: 0 }}
      />

      {/* 顶部提示条 */}
      <div className="shared-view-banner">
        <Space>
          <ShareAltOutlined />
          <Text>这是一个分享的评估结果</Text>
          {evaluation.permission === 'VIEW' ? (
            <Tag icon={<EyeOutlined />}>仅查看</Tag>
          ) : (
            <Tag icon={<CopyOutlined />} color="blue">可复制参数</Tag>
          )}
        </Space>
      </div>

      {/* 主要内容 */}
      <div className="shared-view-content">
        {/* 标题区域 */}
        <Card className="shared-view-header-card">
          <Title level={3} style={{ marginBottom: 8 }}>
            {evaluation.name}
          </Title>
          {evaluation.description && (
            <Text type="secondary">{evaluation.description}</Text>
          )}
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              创建于 {formatDate(evaluation.created_at)}
            </Text>
          </div>
        </Card>

        {/* 成本汇总 */}
        <Card className="shared-view-summary-card" style={{ marginTop: 24 }}>
          <Title level={4}>
            <DollarOutlined style={{ marginRight: 8 }} />
            成本汇总
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={12} sm={8} md={6}>
              <Statistic
                title="月度总费用"
                value={result.monthly_total}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#2563eb', fontWeight: 600 }}
              />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Statistic
                title="年度总费用"
                value={result.yearly_total}
                precision={2}
                prefix="$"
              />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Statistic
                title="单设备月均"
                value={result.per_device_monthly}
                precision={4}
                prefix="$"
              />
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Statistic
                title="设备数量"
                value={functional.device_count}
                suffix="台"
              />
            </Col>
          </Row>
        </Card>

        {/* 费用明细 */}
        <Card className="shared-view-breakdown-card" style={{ marginTop: 24 }}>
          <Title level={4}>费用明细</Title>
          <CostBreakdownTable
            breakdown={result.breakdown}
            monthlyTotal={result.monthly_total}
            region={pricing.region}
            storageClass={technical.storage_class as StorageClass}
          />
        </Card>

        {/* 参数配置 */}
        <Card className="shared-view-params-card" style={{ marginTop: 24 }}>
          <Title level={4}>参数配置</Title>

          <Divider style={{ borderColor: '#e2e8f0' }}>
            <Text type="secondary">功能维度</Text>
          </Divider>
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
            <Descriptions.Item label="设备数量">
              {functional.device_count} 台
            </Descriptions.Item>
            <Descriptions.Item label="录像模式">
              {getRecordingModeLabel(functional.recording_mode)}
            </Descriptions.Item>
            <Descriptions.Item label="视频质量">
              {getVideoQualityLabel(functional.video_quality)}
            </Descriptions.Item>
            <Descriptions.Item label="每日事件数">
              {functional.events_per_day} 次
            </Descriptions.Item>
            <Descriptions.Item label="事件时长">
              {functional.event_duration_sec} 秒
            </Descriptions.Item>
            <Descriptions.Item label="保留天数">
              {functional.retention_days} 天
            </Descriptions.Item>
            <Descriptions.Item label="回看比例">
              {(functional.access_pattern * 100).toFixed(0)}%
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ borderColor: '#e2e8f0' }}>
            <Text type="secondary">技术维度</Text>
          </Divider>
          <Descriptions column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="存储类型">
              {getStorageClassLabel(technical.storage_class)}
            </Descriptions.Item>
            {technical.lifecycle_policy?.enabled && (
              <Descriptions.Item label="生命周期策略">
                已启用
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider style={{ borderColor: '#e2e8f0' }}>
            <Text type="secondary">价格维度</Text>
          </Divider>
          <Descriptions column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="AWS 区域">
              {pricing.region}
            </Descriptions.Item>
            <Descriptions.Item label="折扣比例">
              {pricing.discount_percent}%
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 底部操作 */}
        {evaluation.permission === 'DUPLICATE' && (
          <Card className="shared-view-actions-card" style={{ marginTop: 24 }}>
            <Space>
              <Link
                to={`/calculator?preset=${encodeURIComponent(
                  JSON.stringify(input_data)
                )}`}
              >
                <Button type="primary" icon={<CopyOutlined />}>
                  复制参数到新评估
                </Button>
              </Link>
            </Space>
          </Card>
        )}
      </div>

      <style>{`
        .shared-view-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }
        .shared-view-error {
          padding: 48px 24px;
        }
        .shared-view-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          background: linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%);
          border-bottom: 1px solid #d6e4ff;
        }
        .shared-view-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }
        .shared-view-header-card {
          border-left: 4px solid #2563eb;
        }
      `}</style>
    </div>
  );
};

export default SharedView;
