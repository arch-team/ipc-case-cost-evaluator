/**
 * 分阶段费用组件
 *
 * 以卡片列表形式展示分阶段的费用明细，消除横向滚动问题
 * - 每阶段一张卡片（包含6项费用：存储/PUT/GET/检索/转换/数据传输）
 * - 底部汇总栏（月度总费用）
 */
import React, { useState, useEffect } from 'react';
import { Typography } from 'antd';
import type { StageCostDetail } from '../../types/calculationRecords';
import { formatNumber } from '../../utils/formatters';
import StageCostCard from './StageCostCard';

const { Text } = Typography;

interface StageCostTableProps {
  stages: StageCostDetail[];
  compact?: boolean; // 紧凑模式（保留向后兼容）
}

const StageCostTable: React.FC<StageCostTableProps> = ({
  stages,
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text strong>月度总费用</Text>
          <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
            ${formatNumber(stageTotalCost, 4)}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default StageCostTable;
