/**
 * 核算记录对比页面
 */
import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Spin,
  Alert,
  Result,
} from 'antd';
import { SwapOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { calculationRecordApi } from '../api/calculationRecords';
import type { CalculationRecord } from '../types/calculationRecords';
import { AuthContext } from '../contexts/AuthContext';
import {
  CostSummaryComparison,
  RecordComparisonChart,
  MetricsComparison,
  StageDetailsComparison,
  InputParamsComparison,
  PricingComparison,
} from '../components/comparison';
import { RECORD_COLORS } from '../utils/comparisonHelpers';

const { Title, Text } = Typography;

const RecordComparison: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const isLoggedIn = !!authContext?.user;

  // 解析 URL 参数
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam.split(',').filter((id) => id.trim());

  // 数据状态
  const [records, setRecords] = useState<CalculationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取记录数据
  useEffect(() => {
    const fetchRecords = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      if (ids.length < 2 || ids.length > 4) {
        setError('请选择 2-4 条记录进行对比');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await calculationRecordApi.getBatch(ids);
        setRecords(data);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || '获取记录失败');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [idsParam, isLoggedIn]);

  // 未登录
  if (!isLoggedIn) {
    return (
      <Card>
        <Result
          status="warning"
          title="请先登录"
          subTitle="您需要登录后才能使用对比功能"
          extra={
            <Button type="primary" onClick={() => navigate('/settings')}>
              去登录
            </Button>
          }
        />
      </Card>
    );
  }

  // 参数错误
  if (ids.length < 2 || ids.length > 4) {
    return (
      <Card>
        <Result
          status="warning"
          title="参数错误"
          subTitle="请选择 2-4 条记录进行对比"
          extra={
            <Button type="primary" onClick={() => navigate('/calculation-records')}>
              返回记录列表
            </Button>
          }
        />
      </Card>
    );
  }

  // 加载中
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>正在加载对比数据...</Text>
          </div>
        </div>
      </Card>
    );
  }

  // 错误
  if (error) {
    return (
      <Card>
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          action={
            <Space>
              <Button onClick={() => window.location.reload()}>重试</Button>
              <Button type="primary" onClick={() => navigate('/calculation-records')}>
                返回列表
              </Button>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              <SwapOutlined style={{ marginRight: 8 }} />
              核算记录对比
            </Title>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">对比 {records.length} 条记录的成本明细</Text>
            </div>
          </div>
          <Space>
            {records.map((r, i) => (
              <Tag
                key={r.record_id}
                color={RECORD_COLORS[i]}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {r.name}
              </Tag>
            ))}
          </Space>
        </div>
        <div style={{ marginTop: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/calculation-records')}
          >
            返回记录列表
          </Button>
        </div>
      </Card>

      {/* 1. 费用汇总对比 + 柱状图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="💰 费用汇总对比" size="small">
            <CostSummaryComparison records={records} />
          </Card>
        </Col>
        <Col span={10}>
          <RecordComparisonChart records={records} />
        </Col>
      </Row>

      {/* 2. 中间指标对比 */}
      <Card title="📊 计算过程对比" style={{ marginBottom: 16 }}>
        <MetricsComparison records={records} />
      </Card>

      {/* 3. 分阶段费用明细对比 */}
      <Card title="📋 分阶段费用明细对比" style={{ marginBottom: 16 }}>
        <StageDetailsComparison records={records} />
      </Card>

      {/* 4. 输入参数对比 */}
      <Card title="⚙️ 输入参数对比" style={{ marginBottom: 16 }}>
        <InputParamsComparison records={records} />
      </Card>

      {/* 5. 定价信息对比 */}
      <Card title="💵 定价信息对比">
        <PricingComparison records={records} />
      </Card>
    </div>
  );
};

export default RecordComparison;
