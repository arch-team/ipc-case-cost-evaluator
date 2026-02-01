/**
 * 核算记录对比页面 - 优化版
 * 信息架构：结论先行，渐进式披露
 *
 * 样式优化：
 * - 折叠面板使用圆角和阴影增强视觉层次
 * - 间距节奏优化：大区块24px，卡片内16px，表格行12px
 * - 使用统一的配色系统
 */
import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Spin,
  Alert,
  Result,
  Collapse,
  Affix,
  Divider,
  Anchor,
  Badge,
} from 'antd';
import {
  SwapOutlined,
  ArrowLeftOutlined,
  BarChartOutlined,
  CalculatorOutlined,
  TableOutlined,
  SettingOutlined,
  DollarOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
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
  ComparisonConclusion,
  CostOverviewCards,
} from '../components/comparison';
import { COMPARISON_CONFIG } from '../constants/comparison';
import { areValuesEqual } from '../utils/comparisonHelpers';
import { handleApiError } from '../utils/errors';
import { parseIdList } from '../utils/urlHelpers';
import { formatNumber } from '../utils/formatters';

const { Text } = Typography;

// 使用统一配置的记录颜色
const RECORD_COLORS = COMPARISON_CONFIG.recordColors;

const RecordComparison: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const isLoggedIn = !!authContext?.user;

  // 解析 URL 参数
  const idsParam = searchParams.get('ids') || '';
  const ids = parseIdList(idsParam);

  // 数据状态
  const [records, setRecords] = useState<CalculationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [affixed, setAffixed] = useState(false);

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
        const detail = handleApiError(err, '获取记录失败');
        setError(detail);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [idsParam, isLoggedIn]);

  // 检查是否有参数差异
  const hasParamDifferences = records.length > 1 && !areValuesEqual(
    records.map((r) => JSON.stringify(r.input_params))
  );

  // 检查是否有多阶段
  const hasMultiStages = records.some((r) => r.stage_details.length > 1);

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

  // 折叠面板配置
  const collapseItems = [
    {
      key: 'cost-detail',
      label: (
        <Space>
          <TableOutlined />
          <span>费用明细</span>
        </Space>
      ),
      extra: <Badge count="核心" style={{ backgroundColor: '#52c41a' }} />,
      children: <CostSummaryComparison records={records} />,
    },
    {
      key: 'metrics',
      label: (
        <Space>
          <CalculatorOutlined />
          <span>计算过程 (中间指标)</span>
        </Space>
      ),
      children: <MetricsComparison records={records} />,
    },
    {
      key: 'stages',
      label: (
        <Space>
          <BarChartOutlined />
          <span>分阶段费用</span>
        </Space>
      ),
      extra: hasMultiStages ? (
        <Badge count="多阶段" style={{ backgroundColor: '#1890ff' }} />
      ) : null,
      children: <StageDetailsComparison records={records} />,
    },
    {
      key: 'params',
      label: (
        <Space>
          <SettingOutlined />
          <span>输入参数差异</span>
        </Space>
      ),
      extra: hasParamDifferences ? <Badge dot color="orange" /> : null,
      children: <InputParamsComparison records={records} />,
    },
    {
      key: 'pricing',
      label: (
        <Space>
          <DollarOutlined />
          <span>定价信息</span>
        </Space>
      ),
      children: <PricingComparison records={records} />,
    },
  ];

  return (
    <div>
      {/* 粘性顶部导航 */}
      <Affix offsetTop={0} onChange={(affixed) => setAffixed(!!affixed)}>
        <Card
          size="small"
          style={{
            borderRadius: affixed ? 0 : undefined,
            boxShadow: affixed ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
            marginBottom: affixed ? 0 : 16,
          }}
          bodyStyle={{ padding: '8px 16px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {/* 左侧：返回和标题 */}
            <Space split={<Divider type="vertical" />}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/calculation-records')}
              >
                返回列表
              </Button>
              <Space>
                <SwapOutlined />
                <Text strong>核算记录对比</Text>
              </Space>
            </Space>

            {/* 中间：记录标签 */}
            <Space size={4} wrap>
              {records.map((r, i) => (
                <Tag
                  key={r.record_id}
                  color={RECORD_COLORS[i]}
                  style={{ margin: 0 }}
                >
                  {r.name}: ${formatNumber(r.cost_summary.total_cost, 2)}
                </Tag>
              ))}
            </Space>

            {/* 右侧：快速锚点 */}
            <Anchor
              direction="horizontal"
              items={[
                { key: 'conclusion', href: '#conclusion', title: '结论' },
                { key: 'overview', href: '#overview', title: '总览' },
                { key: 'details', href: '#details', title: '详情' },
              ]}
              style={{ padding: 0 }}
            />
          </div>
        </Card>
      </Affix>

      {/* Level 1: 对比结论区 - 间距 24px */}
      <div id="conclusion" style={{ marginBottom: 24 }}>
        <ComparisonConclusion records={records} />
      </div>

      {/* Level 2: 成本总览区 - 间距 24px */}
      <div id="overview" style={{ marginBottom: 24 }}>
        <Card
          title={
            <Space>
              <BarChartOutlined style={{ color: COMPARISON_CONFIG.highlightColors.best }} />
              <span>成本总览</span>
            </Space>
          }
          size="small"
          style={{ borderRadius: 8 }}
        >
          {/* 成本卡片 */}
          <CostOverviewCards records={records} />

          {/* 费用构成柱状图 - 内部间距 16px */}
          <div style={{ marginTop: 16 }}>
            <RecordComparisonChart records={records} />
          </div>
        </Card>
      </div>

      {/* Level 3: 详情展开区 */}
      <div id="details">
        <Card
          title={
            <Space>
              <TableOutlined />
              <span>详细数据</span>
            </Space>
          }
          size="small"
          extra={<Text type="secondary">点击展开查看详情</Text>}
        >
          <Collapse
            defaultActiveKey={['cost-detail']}
            items={collapseItems}
            expandIconPosition="start"
            bordered={false}
            expandIcon={({ isActive }) => (
              <CaretRightOutlined
                rotate={isActive ? 90 : 0}
                style={{ color: COMPARISON_CONFIG.highlightColors.best }}
              />
            )}
            style={{
              background: '#fff',
              borderRadius: 8,
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default RecordComparison;
