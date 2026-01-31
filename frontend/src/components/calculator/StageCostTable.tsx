/**
 * 分阶段费用组件
 *
 * 以卡片列表形式展示分阶段的费用明细，消除横向滚动问题
 * - 每阶段一张卡片
 * - 底部汇总栏 (DTO + 总费用)
 */
import React, { useState, useEffect } from 'react';
import { Typography, Divider, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { StageCostDetail, TierDetailSnapshot } from '../../types/calculationRecords';
import { formatNumber } from '../../utils/formatters';
import StageCostCard from './StageCostCard';

const { Text } = Typography;

interface StageCostTableProps {
  stages: StageCostDetail[];
  compact?: boolean; // 紧凑模式（保留向后兼容）
  dataTransferCost?: number; // 数据传输费用（全局费用，不按阶段分）
  dataTransferTiers?: TierDetailSnapshot[]; // 数据传输阶梯明细
  totalCostWithTransfer?: number; // 包含传输费用的总成本
}

const StageCostTable: React.FC<StageCostTableProps> = ({
  stages,
  dataTransferCost,
  dataTransferTiers,
  totalCostWithTransfer,
}) => {
  // 记录展开的卡片（默认全部展开）
  const [expandedStages, setExpandedStages] = useState<Set<number>>(
    () => new Set(stages.map((_, idx) => idx))
  );

  // stages 变化时，默认展开所有新阶段
  useEffect(() => {
    setExpandedStages(new Set(stages.map((_, idx) => idx)));
  }, [stages.length]);

  // 切换卡片展开状态
  const toggleStage = (stageIndex: number) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageIndex)) {
      newExpanded.delete(stageIndex);
    } else {
      newExpanded.add(stageIndex);
    }
    setExpandedStages(newExpanded);
  };

  // 计算阶段费用小计
  const stageTotalCost = stages.reduce((sum, stage) => sum + stage.stage_total, 0);

  return (
    <div className="stage-cost-cards">
      {/* 阶段卡片列表 */}
      {stages.map((stage) => (
        <StageCostCard
          key={stage.stage_index}
          stage={stage}
          stageCount={stages.length}
          expanded={expandedStages.has(stage.stage_index)}
          onToggle={() => toggleStage(stage.stage_index)}
        />
      ))}

      {/* 汇总区域 */}
      <div style={{
        background: '#fafafa',
        borderRadius: 8,
        padding: '16px 20px',
        marginTop: 8,
      }}>
        {/* 阶段费用小计 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: dataTransferCost && dataTransferCost > 0 ? 12 : 0,
        }}>
          <Text type="secondary">阶段费用小计</Text>
          <Text style={{ fontSize: 14 }}>
            ${formatNumber(stageTotalCost, 4)}
          </Text>
        </div>

        {/* 数据传输费用 (DTO) */}
        {dataTransferCost !== undefined && dataTransferCost > 0 && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text type="secondary">数据传输出站 (DTO)</Text>
                {dataTransferTiers && dataTransferTiers.length > 0 && (
                  <Tooltip
                    title={
                      <div style={{ fontSize: 12 }}>
                        {dataTransferTiers.map((tier, idx) => (
                          <div key={idx} style={{ marginBottom: 4 }}>
                            {tier.tier_name}: {formatNumber(tier.quantity_gb, 2)} GB × ${formatNumber(tier.unit_price, 4)}/GB = ${formatNumber(tier.amount, 4)}
                          </div>
                        ))}
                      </div>
                    }
                  >
                    <InfoCircleOutlined style={{ color: '#999', fontSize: 12, cursor: 'help' }} />
                  </Tooltip>
                )}
              </div>
              <Text style={{ fontSize: 14 }}>
                ${formatNumber(dataTransferCost, 4)}
              </Text>
            </div>
          </>
        )}

        {/* 月度总费用 */}
        <Divider style={{ margin: '12px 0' }} />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text strong>月度总费用</Text>
          <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
            ${formatNumber(totalCostWithTransfer ?? stageTotalCost, 4)}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default StageCostTable;
