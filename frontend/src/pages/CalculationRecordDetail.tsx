/**
 * 核算记录详情页面
 *
 * 用户可以查看已保存的核算记录详情，包括：
 * 1. 标题区域：返回按钮、名称、描述、标签、操作按钮
 * 2. 费用汇总 Hero：月度总成本、单设备成本、单 GB 成本
 * 3. 中间计算指标：数据量指标、请求数指标
 * 4. 分阶段费用明细：各存储阶段的费用分项
 * 5. 费用占比分析：饼图可视化
 * 6. 输入参数快照：三维度输入参数
 * 7. 定价快照：定价数据详情
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Spin,
  Typography,
  Tag,
  Divider,
  message,
  Row,
  Col,
  Collapse,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  DollarOutlined,
  PieChartOutlined,
  CalculatorOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { calculationRecordApi } from '../api/calculationRecords';
import type { CalculationRecord } from '../types/calculationRecords';
import { formatNumber } from '../utils/formatters';
import IntermediateMetrics from '../components/calculator/IntermediateMetrics';
import StageCostTable from '../components/calculator/StageCostTable';
import CostPieChart from '../components/calculator/CostPieChart';
import InputParamsDisplay from '../components/calculator/InputParamsDisplay';
import PricingSnapshotDisplay from '../components/calculator/PricingSnapshotDisplay';
import {
  STORAGE_STRATEGY_LABELS,
  STORAGE_STRATEGY_COLORS,
} from '../constants/storageStrategies';

const { Title, Text } = Typography;

// 存储策略显示名称（从统一数据源获取）
const storageStrategyNames = STORAGE_STRATEGY_LABELS;

// 存储策略标签颜色（从统一数据源获取）
const storageStrategyColors = STORAGE_STRATEGY_COLORS;

const CalculationRecordDetail: React.FC = () => {
  const navigate = useNavigate();
  const { recordId } = useParams<{ recordId: string }>();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<CalculationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!recordId) return;
      setLoading(true);
      setError(null);

      try {
        const data = await calculationRecordApi.get(recordId);
        setRecord(data);
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
        const status = axiosError.response?.status;
        const detail = axiosError.response?.data?.detail;

        if (status === 404) {
          message.error('记录不存在');
          navigate('/calculation-records');
        } else if (status === 403) {
          message.error('无权访问此记录');
          navigate('/calculation-records');
        } else if (status === 401) {
          message.warning('请先登录');
          navigate('/settings');
        } else {
          setError(detail || '获取记录详情失败');
          message.error('获取记录详情失败');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [recordId, navigate]);

  // 加载到计算器
  const handleLoadToCalculator = () => {
    if (!record) return;

    // 将记录的输入参数转换为计算器所需的格式
    const inputData = {
      functional: {
        device_count: record.input_params.functional.device_count,
        recording_mode: record.input_params.functional.recording_mode,
        video_quality: record.input_params.functional.video_quality,
        retention_days: record.input_params.functional.retention_days,
        events_per_day: record.input_params.functional.events_per_day,
        event_duration_sec: record.input_params.functional.event_duration_seconds,
        scheduled_hours: record.input_params.functional.scheduled_hours,
        access_pattern: record.input_params.functional.access_pattern,
      },
      technical: {
        storage_class: record.input_params.technical.storage_class,
        segment_strategy: record.input_params.technical.segment_strategy,
        segment_value: record.input_params.technical.segment_seconds ||
                       record.input_params.technical.segment_size_kb ||
                       15,
        lifecycle_policy: {
          enabled: record.input_params.technical.lifecycle_enabled,
          stages: record.input_params.technical.lifecycle_stages,
        },
      },
      pricing: {
        region: record.input_params.pricing.region,
        discount_percent: record.input_params.pricing.discount_percent,
      },
    };

    navigate('/detailed-calculation', {
      state: {
        loadFromRecord: inputData,
      },
    });
    message.success('已加载配置到详细核算页面');
  };

  // 将费用汇总转换为 CostPieChart 需要的格式
  const getBreakdownForChart = () => {
    if (!record) return null;
    const summary = record.cost_summary;
    return {
      storage_cost: summary.storage_cost,
      put_request_cost: summary.put_request_cost,
      get_request_cost: summary.get_request_cost,
      retrieval_cost: summary.retrieval_cost,
      data_transfer_cost: summary.data_transfer_cost,
      lifecycle_cost: summary.lifecycle_cost,
      total: summary.total_cost,
    };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !record) {
    return (
      <Card>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate('/calculation-records')}>
              返回列表
            </Button>
          }
        />
      </Card>
    );
  }

  if (!record) {
    return null;
  }

  const breakdown = getBreakdownForChart();

  return (
    <div>
      <Card>
        {/* 返回按钮 */}
        <div style={{ marginBottom: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/calculation-records')}
          >
            返回列表
          </Button>
        </div>

        {/* 标题区域 */}
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {record.name}
            </Title>
            {record.description && (
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                {record.description}
              </Text>
            )}
            <div style={{ marginTop: 8 }}>
              <Tag color={storageStrategyColors[record.storage_strategy]}>
                {storageStrategyNames[record.storage_strategy]}
              </Tag>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                创建于 {new Date(record.created_at).toLocaleString('zh-CN')}
              </Text>
            </div>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleLoadToCalculator}
            >
              加载到计算器
            </Button>
          </Space>
        </div>

        <Divider />

        {/* 费用汇总 Hero */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 8,
            padding: '24px',
            marginBottom: 24,
            color: '#fff',
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
                  月度总成本
                </div>
                <div style={{ fontSize: 32, fontWeight: 600 }}>
                  ${formatNumber(record.cost_summary.total_cost, 4)}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  单设备成本
                </div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>
                  ${formatNumber(record.cost_summary.cost_per_device, 4)}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  单 GB 成本
                </div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>
                  ${formatNumber(record.cost_summary.cost_per_gb, 4)}
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <Row gutter={8}>
                <Col span={8}>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>存储费用</div>
                  <div style={{ fontSize: 13 }}>
                    ${formatNumber(record.cost_summary.storage_cost, 2)}
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>请求费用</div>
                  <div style={{ fontSize: 13 }}>
                    ${formatNumber(
                      record.cost_summary.put_request_cost +
                        record.cost_summary.get_request_cost,
                      2
                    )}
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>传输费用</div>
                  <div style={{ fontSize: 13 }}>
                    ${formatNumber(record.cost_summary.data_transfer_cost, 2)}
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>

        {/* 中间计算指标 */}
        <Collapse
          defaultActiveKey={['metrics']}
          items={[
            {
              key: 'metrics',
              label: (
                <span>
                  <CalculatorOutlined style={{ marginRight: 8 }} />
                  中间计算指标
                </span>
              ),
              children: (
                <IntermediateMetrics metrics={record.intermediate_metrics} />
              ),
            },
          ]}
          style={{ marginBottom: 24 }}
        />

        {/* 分阶段费用明细 */}
        <Collapse
          defaultActiveKey={['stages']}
          items={[
            {
              key: 'stages',
              label: (
                <span>
                  <DollarOutlined style={{ marginRight: 8 }} />
                  分阶段费用明细
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    （点击行展开查看计算公式）
                  </Text>
                </span>
              ),
              children: (
                <StageCostTable stages={record.stage_details} />
              ),
            },
          ]}
          style={{ marginBottom: 24 }}
        />

        {/* 费用占比分析 */}
        {breakdown && (
          <Collapse
            defaultActiveKey={['chart']}
            items={[
              {
                key: 'chart',
                label: (
                  <span>
                    <PieChartOutlined style={{ marginRight: 8 }} />
                    费用占比分析
                  </span>
                ),
                children: (
                  <div style={{ height: 300 }}>
                    <CostPieChart breakdown={breakdown} />
                  </div>
                ),
              },
            ]}
            style={{ marginBottom: 24 }}
          />
        )}

        {/* 输入参数快照 */}
        <Collapse
          items={[
            {
              key: 'params',
              label: (
                <span>
                  <SettingOutlined style={{ marginRight: 8 }} />
                  输入参数快照
                </span>
              ),
              children: (
                <InputParamsDisplay params={record.input_params} />
              ),
            },
          ]}
          style={{ marginBottom: 24 }}
        />

        {/* 定价快照 */}
        <Collapse
          items={[
            {
              key: 'pricing',
              label: (
                <span>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  定价快照
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    （记录创建时的 AWS 定价数据）
                  </Text>
                </span>
              ),
              children: (
                <PricingSnapshotDisplay snapshot={record.pricing_snapshot} />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default CalculationRecordDetail;
