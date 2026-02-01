/**
 * 评估详情页面
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Spin,
  Typography,
  Tag,
  Divider,
  message,
  Row,
  Col,
  Statistic,
  Table,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  ExportOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { evaluationApi } from '../api/client';
import type { Evaluation } from '../types';

const { Title, Text } = Typography;

// 录像模式映射
const recordingModeMap: Record<string, string> = {
  continuous: '连续录像',
  event_triggered: '事件触发',
  scheduled: '定时录像',
};

// 视频质量映射
const videoQualityMap: Record<string, string> = {
  '720p': '720P (1Mbps)',
  '1080p': '1080P (2.5Mbps)',
  '2K': '2K (5Mbps)',
  '4K': '4K (12Mbps)',
};

// 存储类型映射
const storageClassMap: Record<string, { label: string; color: string }> = {
  STANDARD: { label: 'S3 Standard', color: 'blue' },
  GLACIER_IR: { label: 'S3 Glacier IR', color: 'purple' },
  DEEP_ARCHIVE: { label: 'S3 Deep Archive', color: 'orange' },
};

const EvaluationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await evaluationApi.get(id);
        setEvaluation(data);
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          message.error('评估记录不存在');
          navigate('/history?type=legacy');
        } else if (axiosError.response?.status === 401) {
          message.warning('请先登录');
          navigate('/history?type=legacy');
        } else {
          message.error('获取评估记录失败');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [id, navigate]);

  const handleLoad = () => {
    if (!evaluation) return;
    navigate('/cost-analysis?tab=quick', {
      state: {
        loadFromEvaluation: evaluation,
      },
    });
    message.success('已加载评估配置到成本分析');
  };

  const handleCopy = async () => {
    if (!evaluation) return;
    try {
      await evaluationApi.duplicate(evaluation.id, `${evaluation.name} - 副本`);
      message.success('复制成功');
      navigate('/history?type=legacy');
    } catch {
      message.error('复制失败');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!evaluation) {
    return null;
  }

  const { input_data, result } = evaluation;
  const { functional, technical, pricing } = input_data;
  const storageInfo = storageClassMap[technical.storage_class] || {
    label: technical.storage_class,
    color: 'default',
  };

  // 费用明细表格数据
  const costBreakdownData = [
    {
      key: 'storage',
      item: '存储费用',
      value: result.breakdown?.storage_cost || 0,
    },
    {
      key: 'put',
      item: 'PUT 请求费用',
      value: result.breakdown?.put_request_cost || 0,
    },
    {
      key: 'get',
      item: 'GET 请求费用',
      value: result.breakdown?.get_request_cost || 0,
    },
    {
      key: 'retrieval',
      item: '数据检索费用',
      value: result.breakdown?.retrieval_cost || 0,
    },
    {
      key: 'transfer',
      item: '数据传输费用',
      value: result.breakdown?.data_transfer_cost || 0,
    },
    {
      key: 'lifecycle',
      item: '生命周期转换费用',
      value: result.breakdown?.lifecycle_cost || 0,
    },
  ].filter((item) => item.value > 0);

  const costColumns = [
    {
      title: '费用项目',
      dataIndex: 'item',
      key: 'item',
    },
    {
      title: '月度费用',
      dataIndex: 'value',
      key: 'value',
      align: 'right' as const,
      render: (value: number) => `$${value.toFixed(2)}`,
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/history?type=legacy')}>
              返回列表
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {evaluation.name}
            </Title>
            {evaluation.description && (
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                {evaluation.description}
              </Text>
            )}
            <div style={{ marginTop: 8 }}>
              <Tag color={storageInfo.color}>{storageInfo.label}</Tag>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                创建于 {new Date(evaluation.created_at || '').toLocaleString('zh-CN')}
              </Text>
            </div>
          </div>
          <Space>
            <Button icon={<PlayCircleOutlined />} onClick={handleLoad}>
              加载到计算器
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制
            </Button>
            <Button icon={<ExportOutlined />} disabled>
              导出
            </Button>
            <Button icon={<ShareAltOutlined />} disabled>
              分享
            </Button>
          </Space>
        </div>

        <Divider />

        {/* 成本概览 */}
        <Title level={4}>成本概览</Title>
        <Row gutter={24} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="月度总成本"
                value={result.monthly_total}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="年度总成本"
                value={result.yearly_total}
                precision={2}
                prefix="$"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="单设备月成本"
                value={result.per_device_monthly}
                precision={4}
                prefix="$"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="设备数量"
                value={result.device_count}
                suffix="台"
              />
            </Card>
          </Col>
        </Row>

        {/* 费用明细 */}
        <Title level={4}>费用明细</Title>
        <Table
          dataSource={costBreakdownData}
          columns={costColumns}
          pagination={false}
          size="small"
          style={{ marginBottom: 24, maxWidth: 500 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>合计</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong>${result.monthly_total.toFixed(2)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />

        <Divider />

        {/* 输入参数 */}
        <Title level={4}>输入参数</Title>

        <Title level={5}>功能配置</Title>
        <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="设备数量">{functional.device_count} 台</Descriptions.Item>
          <Descriptions.Item label="录像模式">
            {recordingModeMap[functional.recording_mode] || functional.recording_mode}
          </Descriptions.Item>
          <Descriptions.Item label="视频质量">
            {videoQualityMap[functional.video_quality] || functional.video_quality}
          </Descriptions.Item>
          <Descriptions.Item label="存储周期">{functional.retention_days} 天</Descriptions.Item>
          <Descriptions.Item label="回看比例">{(functional.access_pattern * 100).toFixed(0)}%</Descriptions.Item>
          {functional.recording_mode === 'event_triggered' && (
            <>
              <Descriptions.Item label="每日事件数">{functional.events_per_day} 次</Descriptions.Item>
              <Descriptions.Item label="事件时长">{functional.event_duration_sec} 秒</Descriptions.Item>
            </>
          )}
        </Descriptions>

        <Title level={5}>技术配置</Title>
        <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="存储类型">
            <Tag color={storageInfo.color}>{storageInfo.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="生命周期策略">
            {technical.lifecycle_policy ? '已启用' : '未启用'}
          </Descriptions.Item>
          {technical.lifecycle_policy && technical.lifecycle_policy.transition_days && (
            <Descriptions.Item label="转换天数">
              {technical.lifecycle_policy.transition_days} 天
            </Descriptions.Item>
          )}
          {technical.lifecycle_policy && technical.lifecycle_policy.target_class && (
            <Descriptions.Item label="目标存储类型">
              {storageClassMap[technical.lifecycle_policy.target_class]?.label ||
                technical.lifecycle_policy.target_class}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Title level={5}>定价配置</Title>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="AWS 区域">{pricing.region}</Descriptions.Item>
          <Descriptions.Item label="折扣比例">{pricing.discount_percent}%</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default EvaluationDetail;
