/**
 * 成本总览卡片组件 - 直观展示各方案总成本对比
 *
 * 配色优化：
 * - 推荐卡片：渐变蓝背景 + 蓝色边框（专业可信）
 * - 非推荐卡片：中性灰背景（无负面暗示）
 * - "成本最高"改为"参考基准"（避免负面心理暗示）
 */
import React from 'react';
import { Row, Col, Card, Typography, Tag, Badge, Progress, Space } from 'antd';
import { TrophyOutlined, ArrowDownOutlined } from '@ant-design/icons';
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

const CostOverviewCards: React.FC<Props> = ({ records }) => {
  // 计算成本范围
  const costs = records.map((r) => r.cost_summary.total_cost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);

  // 找出最优方案索引
  const bestIndex = costs.indexOf(minCost);

  // 计算列宽（根据记录数量）
  const colSpan = records.length === 2 ? 12 : records.length === 3 ? 8 : 6;

  return (
    <Row gutter={16}>
      {records.map((record, index) => {
        const isBest = index === bestIndex && records.length > 1;
        const isWorst = record.cost_summary.total_cost === maxCost && minCost !== maxCost;
        const savedFromWorst = maxCost - record.cost_summary.total_cost;
        const savedPercent = maxCost > 0 ? (savedFromWorst / maxCost) * 100 : 0;

        // 进度条百分比（相对于最高成本）
        const progressPercent = maxCost > 0 ? (record.cost_summary.total_cost / maxCost) * 100 : 100;

        return (
          <Col key={record.record_id} span={colSpan}>
            <Badge.Ribbon
              text={isBest ? '推荐' : undefined}
              color={isBest ? '#1890ff' : 'transparent'}
              style={{ display: isBest ? 'block' : 'none' }}
            >
              <Card
                hoverable
                style={{
                  borderColor: isBest
                    ? COMPARISON_CONFIG.cardStyles.recommended.borderColor
                    : COMPARISON_CONFIG.cardStyles.normal.borderColor,
                  borderWidth: isBest
                    ? COMPARISON_CONFIG.cardStyles.recommended.borderWidth
                    : COMPARISON_CONFIG.cardStyles.normal.borderWidth,
                  background: isBest
                    ? COMPARISON_CONFIG.cardStyles.recommended.background
                    : COMPARISON_CONFIG.cardStyles.normal.background,
                  boxShadow: isBest ? COMPARISON_CONFIG.cardStyles.recommended.boxShadow : undefined,
                  transform: undefined,  // 移除 scale 效果
                  transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                {/* 方案名称 */}
                <div style={{ marginBottom: 12 }}>
                  <Space size={8} align="center">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: COMPARISON_CONFIG.recordColors[index],
                      }}
                    />
                    <Text strong style={{ fontSize: 16 }}>
                      {record.name}
                    </Text>
                    {isBest && (
                      <TrophyOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                    )}
                  </Space>
                </div>

                {/* 存储策略 */}
                <div style={{ marginBottom: 16 }}>
                  <Tag color={STORAGE_STRATEGY_COLORS[record.storage_strategy]}>
                    {STORAGE_STRATEGY_NAMES[record.storage_strategy]}
                  </Tag>
                </div>

                {/* 总成本 */}
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <Title
                    level={2}
                    style={{
                      margin: 0,
                      // 仅推荐方案使用蓝色，其他使用中性深灰色
                      color: isBest
                        ? COMPARISON_CONFIG.highlightColors.best
                        : COMPARISON_CONFIG.semanticColors.neutral,
                    }}
                  >
                    ${formatNumber(record.cost_summary.total_cost, 2)}
                  </Title>
                  <Text type="secondary">/月</Text>
                </div>

                {/* 成本进度条 - 使用方案专属色 */}
                <Progress
                  percent={progressPercent}
                  showInfo={false}
                  strokeColor={{
                    '0%': COMPARISON_CONFIG.recordColors[index],
                    '100%': `${COMPARISON_CONFIG.recordColors[index]}cc`,
                  }}
                  size="small"
                  style={{ marginBottom: 12 }}
                />

                {/* 节省金额（相对最高成本方案） */}
                {savedFromWorst > 0 && minCost !== maxCost && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '8px 0',
                      background: '#f6ffed',
                      borderRadius: 4,
                    }}
                  >
                    <ArrowDownOutlined
                      style={{ color: COMPARISON_CONFIG.semanticColors.saving, marginRight: 4 }}
                    />
                    <Text style={{ color: COMPARISON_CONFIG.semanticColors.saving }}>
                      省 ${formatNumber(savedFromWorst, 2)} ({formatNumber(savedPercent, 1)}%)
                    </Text>
                  </div>
                )}

                {/* 参考基准标记（原"成本最高"改为中性表述） */}
                {isWorst && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '8px 0',
                      background: '#f5f5f5',
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: COMPARISON_CONFIG.highlightColors.baseline }}>
                      参考基准
                    </Text>
                  </div>
                )}

                {/* 单位成本指标 */}
                <Row gutter={8} style={{ marginTop: 12 }}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        单设备
                      </Text>
                      <div>
                        <Text strong>${formatNumber(record.cost_summary.cost_per_device, 4)}</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        单 GB
                      </Text>
                      <div>
                        <Text strong>${formatNumber(record.cost_summary.cost_per_gb, 4)}</Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Badge.Ribbon>
          </Col>
        );
      })}
    </Row>
  );
};

export default CostOverviewCards;
