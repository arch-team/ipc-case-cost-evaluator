/**
 * 阶段费用卡片组件
 *
 * 以卡片形式展示单个阶段的费用明细：
 * - 头部: 阶段名 + 存储类型标签 + 小计
 * - 内容: 费用项固定6列对齐显示（便于跨阶段比较）
 * - 展开: 计算公式详情
 */
import React from 'react';
import { Card, Tag, Typography, Space, Tooltip } from 'antd';
import {
  DatabaseOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  SyncOutlined,
  SwapOutlined,
  SendOutlined,
  InfoCircleOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { StageCostDetail, CostItemDetail } from '../../types/calculationRecords';
import { formatNumber } from '../../utils/formatters';
import {
  getStorageClassLabel,
  getStorageClassColor,
} from '../../constants/storageClasses';

const { Text } = Typography;

interface StageCostCardProps {
  stage: StageCostDetail;
  stageCount: number; // 总阶段数，用于判断显示"全周期"还是"阶段X"
  expanded?: boolean;
  onToggle?: () => void;
}

// 费用项配置（固定顺序，便于对齐）
const COST_ITEM_CONFIG = [
  { key: 'storage', label: '存储费用', icon: <DatabaseOutlined />, color: '#5470c6' },
  { key: 'put', label: 'PUT请求', icon: <CloudUploadOutlined />, color: '#91cc75' },
  { key: 'get', label: 'GET请求', icon: <CloudDownloadOutlined />, color: '#fac858' },
  { key: 'retrieval', label: '检索费用', icon: <SyncOutlined />, color: '#ee6666' },
  { key: 'transition', label: '转换费用', icon: <SwapOutlined />, color: '#73c0de' },
  { key: 'transfer', label: '数据传输', icon: <SendOutlined />, color: '#9254de' },
];

// 格式化费用公式
const formatCostFormula = (item: CostItemDetail | null | undefined): string => {
  if (!item || item.amount === 0) return '-';
  return `${formatNumber(item.unit_price, 6)} ${item.unit_price_unit} × ${formatNumber(item.quantity, 4)} ${item.quantity_unit} = $${formatNumber(item.amount, 4)}`;
};

// 费用项展示组件（始终显示，0值时显示占位）
interface CostItemProps {
  label: string;
  icon: React.ReactNode;
  item: CostItemDetail | null | undefined;
  color: string;
}

const CostItem: React.FC<CostItemProps> = ({ label, icon, item, color }) => {
  const hasValue = item && item.amount > 0;
  const iconColor = hasValue ? color : '#bfbfbf';

  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 4px',
      background: hasValue ? `${color}10` : '#f5f5f5',
      borderRadius: 4,
      minWidth: 80,
      cursor: hasValue ? 'help' : 'default',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
        color: hasValue ? color : '#999',
      }}>
        <span style={{ fontSize: 14, color: iconColor, display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <span style={{ fontSize: 11, color: hasValue ? '#666' : '#999' }}>{label}</span>
      </div>
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        color: hasValue ? color : '#bfbfbf',
      }}>
        {hasValue ? `$${formatNumber(item.amount, 2)}` : '-'}
      </span>
    </div>
  );

  if (hasValue && item) {
    return (
      <Tooltip
        title={
          <div style={{ fontSize: 12 }}>
            <div>单价: {formatNumber(item.unit_price, 6)} {item.unit_price_unit}</div>
            <div>用量: {formatNumber(item.quantity, 4)} {item.quantity_unit}</div>
            <div>金额: ${formatNumber(item.amount, 4)}</div>
          </div>
        }
      >
        {content}
      </Tooltip>
    );
  }

  return content;
};

const StageCostCard: React.FC<StageCostCardProps> = ({
  stage,
  stageCount,
  expanded = false,
  onToggle,
}) => {
  const stageName = stageCount === 1 ? '全周期' : `阶段 ${stage.stage_index + 1}`;

  // 获取费用项数据
  const getCostItem = (key: string): CostItemDetail | null | undefined => {
    switch (key) {
      case 'storage': return stage.storage_cost;
      case 'put': return stage.put_request_cost;
      case 'get': return stage.get_request_cost;
      case 'retrieval': return stage.retrieval_cost;
      case 'transition': return stage.transition_cost;
      case 'transfer': return stage.data_transfer_cost;
      default: return null;
    }
  };

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      styles={{
        body: { padding: '12px 16px' },
      }}
    >
      {/* 卡片头部 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          cursor: onToggle ? 'pointer' : 'default',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong style={{ fontSize: 15 }}>{stageName}</Text>
          <Tag color={getStorageClassColor(stage.storage_class, 'ant')}>
            {getStorageClassLabel(stage.storage_class, 'short')}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            第 {stage.start_day}-{stage.end_day} 天
            {stage.access_rate !== undefined && stage.access_rate > 0 && (
              <span style={{ marginLeft: 8, color: '#722ed1' }}>
                访问 {(stage.access_rate * 100).toFixed(1)}%
              </span>
            )}
          </Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
            ${formatNumber(stage.stage_total, 4)}
          </Text>
          {onToggle && (
            expanded
              ? <UpOutlined style={{ fontSize: 12, color: '#999' }} />
              : <DownOutlined style={{ fontSize: 12, color: '#999' }} />
          )}
        </div>
      </div>

      {/* 费用项列表 - 固定6列对齐 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 8,
      }}>
        {COST_ITEM_CONFIG.map(({ key, label, icon, color }) => (
          <CostItem
            key={key}
            label={label}
            icon={icon}
            item={getCostItem(key)}
            color={color}
          />
        ))}
      </div>

      {/* 展开的计算公式详情 */}
      {expanded && (
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: 4,
          fontSize: 12,
        }}>
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <Text strong style={{ fontSize: 12 }}>计算公式</Text>
            </div>

            {COST_ITEM_CONFIG.map(({ key, label }) => {
              const item = getCostItem(key);
              const formula = formatCostFormula(item);
              return (
                <div key={key}>
                  <Text type="secondary">{label}: </Text>
                  <Text style={{
                    fontFamily: 'monospace',
                    color: formula === '-' ? '#bfbfbf' : '#1890ff'
                  }}>
                    {formula}
                  </Text>
                </div>
              );
            })}
          </Space>
        </div>
      )}
    </Card>
  );
};

export default StageCostCard;
