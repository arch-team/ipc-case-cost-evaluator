/**
 * 对比结论组件 - 展示推荐方案和关键洞察
 *
 * 配色优化：
 * - 背景渐变从红绿混合改为蓝金风格
 * - 表格数字使用中性色，仅节省金额使用绿色
 * - 推荐方案使用品牌蓝色突出显示
 */
import React from 'react';
import { Card, Row, Col, Typography, Tag, Space, Statistic, Table, Tooltip } from 'antd';
import {
  TrophyOutlined,
  ArrowDownOutlined,
  BulbOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { CalculationRecord } from '../../types/calculationRecords';
import { COMPARISON_CONFIG } from '../../constants/comparison';
import {
  STORAGE_STRATEGY_NAMES,
  STORAGE_STRATEGY_COLORS,
} from '../../constants/storageStrategies';
import { formatNumber } from '../../utils/formatters';

const { Text, Title } = Typography;

interface Props {
  records: CalculationRecord[];
}

interface SavingComparison {
  record: CalculationRecord;
  index: number;
  savedAmount: number;
  savedPercent: number;
  keyDifferences: string[];
}

/**
 * 分析两个方案的关键差异
 */
function analyzeKeyDifferences(
  bestRecord: CalculationRecord,
  otherRecord: CalculationRecord
): string[] {
  const differences: string[] = [];

  // 存储策略差异
  if (bestRecord.storage_strategy !== otherRecord.storage_strategy) {
    differences.push('存储策略');
  }

  // 设备数量差异
  if (
    bestRecord.input_params.functional.device_count !==
    otherRecord.input_params.functional.device_count
  ) {
    differences.push('设备数量');
  }

  // 保留天数差异
  if (
    bestRecord.input_params.functional.retention_days !==
    otherRecord.input_params.functional.retention_days
  ) {
    differences.push('保留天数');
  }

  // 生命周期策略差异
  if (
    bestRecord.input_params.technical.lifecycle_enabled !==
    otherRecord.input_params.technical.lifecycle_enabled
  ) {
    differences.push('生命周期策略');
  }

  // 存储类型差异
  if (
    bestRecord.input_params.technical.storage_class !==
    otherRecord.input_params.technical.storage_class
  ) {
    differences.push('存储类型');
  }

  // 访问比例差异
  if (
    bestRecord.input_params.functional.access_pattern !==
    otherRecord.input_params.functional.access_pattern
  ) {
    differences.push('访问比例');
  }

  return differences.length > 0 ? differences : ['配置细节'];
}

/**
 * 分析成本驱动因素
 */
function analyzeCostDrivers(record: CalculationRecord): { name: string; percent: number }[] {
  const breakdown = record.cost_summary.breakdown_percent;
  const drivers = [
    { name: '存储费用', percent: breakdown.storage },
    { name: 'PUT 请求', percent: breakdown.put_requests },
    { name: 'GET 请求', percent: breakdown.get_requests },
    { name: '检索费用', percent: breakdown.retrieval },
    { name: '转换费用', percent: breakdown.lifecycle },
    { name: '传输费用', percent: breakdown.data_transfer },
  ];

  // 按占比排序，只返回非零项
  return drivers
    .filter((d) => d.percent > 0)
    .sort((a, b) => b.percent - a.percent);
}

const ComparisonConclusion: React.FC<Props> = ({ records }) => {
  // 找出最优方案（总成本最低）
  const sortedByTotalCost = [...records].sort(
    (a, b) => a.cost_summary.total_cost - b.cost_summary.total_cost
  );
  const bestRecord = sortedByTotalCost[0];
  const bestIndex = records.findIndex((r) => r.record_id === bestRecord.record_id);

  // 计算与其他方案的对比
  const comparisons: SavingComparison[] = records
    .map((r, idx) => {
      if (r.record_id === bestRecord.record_id) return null;
      const savedAmount = r.cost_summary.total_cost - bestRecord.cost_summary.total_cost;
      const savedPercent = r.cost_summary.total_cost > 0
        ? (savedAmount / r.cost_summary.total_cost) * 100
        : 0;
      return {
        record: r,
        index: idx,
        savedAmount,
        savedPercent,
        keyDifferences: analyzeKeyDifferences(bestRecord, r),
      };
    })
    .filter((c): c is SavingComparison => c !== null);

  // 成本驱动因素分析
  const costDrivers = analyzeCostDrivers(bestRecord);
  const topDriver = costDrivers[0];

  // 对比表格列定义
  const columns = [
    {
      title: '对比方案',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, comparison: SavingComparison) => (
        <Space>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: COMPARISON_CONFIG.recordColors[comparison.index],
            }}
          />
          <Text>{comparison.record.name}</Text>
        </Space>
      ),
    },
    {
      title: '月省金额',
      dataIndex: 'savedAmount',
      key: 'savedAmount',
      align: 'right' as const,
      render: (_: unknown, comparison: SavingComparison) => (
        <Text
          strong
          style={{
            color: COMPARISON_CONFIG.semanticColors.saving,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${formatNumber(comparison.savedAmount, 2)}
        </Text>
      ),
    },
    {
      title: '节省比例',
      dataIndex: 'savedPercent',
      key: 'savedPercent',
      align: 'right' as const,
      render: (_: unknown, comparison: SavingComparison) => (
        <Tag color="green">{formatNumber(comparison.savedPercent, 1)}%</Tag>
      ),
    },
    {
      title: '主要差异',
      dataIndex: 'keyDifferences',
      key: 'keyDifferences',
      render: (_: unknown, comparison: SavingComparison) => (
        <Space size={[0, 4]} wrap>
          {comparison.keyDifferences.slice(0, 3).map((diff) => (
            <Tag key={diff} color="default">
              {diff}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <Card
      style={{
        background: COMPARISON_CONFIG.conclusionStyles.background,
        borderColor: '#91caff',  // 浅蓝色，更柔和
        borderWidth: 1,          // 1px 边框
      }}
    >
      <Row gutter={[24, 16]}>
        {/* 推荐方案 */}
        <Col xs={24} md={8}>
          <div style={{ textAlign: 'center' }}>
            <TrophyOutlined
              style={{
                fontSize: 32,
                color: COMPARISON_CONFIG.highlightColors.best,
                marginBottom: 8,
              }}
            />
            <Title level={5} style={{ margin: '8px 0' }}>
              推荐方案
            </Title>
            <div style={{ marginBottom: 8 }}>
              <Tag
                color={COMPARISON_CONFIG.recordColors[bestIndex]}
                style={{ fontSize: 16, padding: '4px 16px' }}
              >
                {bestRecord.name}
              </Tag>
            </div>
            <Tag color={STORAGE_STRATEGY_COLORS[bestRecord.storage_strategy]}>
              {STORAGE_STRATEGY_NAMES[bestRecord.storage_strategy]}
            </Tag>
            <Statistic
              value={bestRecord.cost_summary.total_cost}
              precision={2}
              prefix="$"
              suffix="/月"
              valueStyle={{
                fontSize: 28,
                color: COMPARISON_CONFIG.highlightColors.best,
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
              }}
              style={{ marginTop: 16 }}
            />
          </div>
        </Col>

        {/* 对比节省 */}
        <Col xs={24} md={16}>
          {comparisons.length > 0 && (
            <>
              <Title level={5} style={{ marginBottom: 12 }}>
                <SwapOutlined style={{ marginRight: 8 }} />
                相比其他方案
              </Title>
              <Table
                dataSource={comparisons}
                columns={columns}
                rowKey={(c) => c.record.record_id}
                pagination={false}
                size="small"
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          {/* 关键洞察 */}
          <div
            style={{
              background: COMPARISON_CONFIG.conclusionStyles.insightBackground,
              padding: '12px 16px',
              borderRadius: 8,
              border: `1px solid ${COMPARISON_CONFIG.conclusionStyles.insightBorder}`,
            }}
          >
            <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
              <BulbOutlined style={{ marginRight: 8, color: COMPARISON_CONFIG.highlightColors.best }} />
              关键洞察
            </Title>
            <Space direction="vertical" size={4}>
              {topDriver && (
                <Text>
                  <ArrowDownOutlined
                    style={{ color: COMPARISON_CONFIG.highlightColors.best, marginRight: 4 }}
                  />
                  <strong>{topDriver.name}</strong>是最大成本驱动因素，占比{' '}
                  <Tooltip title="费用占比">
                    <Tag color="blue">{formatNumber(topDriver.percent, 1)}%</Tag>
                  </Tooltip>
                </Text>
              )}
              {bestRecord.input_params.technical.lifecycle_enabled && (
                <Text>
                  <ArrowDownOutlined
                    style={{ color: COMPARISON_CONFIG.semanticColors.saving, marginRight: 4 }}
                  />
                  生命周期策略已启用，可有效降低长期存储成本
                </Text>
              )}
              {comparisons.length > 0 && comparisons[0].savedPercent > 20 && (
                <Text>
                  <ArrowDownOutlined
                    style={{ color: COMPARISON_CONFIG.semanticColors.saving, marginRight: 4 }}
                  />
                  最优方案比次优方案节省超过 <Tag color="green">20%</Tag>
                </Text>
              )}
            </Space>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default ComparisonConclusion;
