/**
 * 费用明细内容组件
 * 从 ResultDisplay 提取，支持表格/图表视图切换
 */
import React, { useState } from 'react';
import { Segmented } from 'antd';
import { PieChartOutlined, TableOutlined } from '@ant-design/icons';
import type { CostSummary, TechnicalDimensions, StorageClass } from '../../types';
import { STORAGE_CLASS_DEFAULTS } from '../../constants/storageClasses';
import CostPieChart from './CostPieChart';
import CostBreakdownTable from './CostBreakdownTable';

interface SchemeInfo {
  id: string;
  name: string;
  technical: TechnicalDimensions;
}

interface BreakdownContentProps {
  result: CostSummary;
  schemeInfo?: SchemeInfo;
  region: string;
  retentionDays?: number;
  accessPattern?: number;
}

type BreakdownViewType = 'chart' | 'table';

const BreakdownContent: React.FC<BreakdownContentProps> = ({
  result,
  schemeInfo,
  region,
  retentionDays,
  accessPattern,
}) => {
  const [breakdownView, setBreakdownView] = useState<BreakdownViewType>('table');

  return (
    <div className="breakdown-content">
      {/* 视图切换 */}
      <div className="breakdown-content-header">
        <Segmented
          value={breakdownView}
          onChange={(value) => setBreakdownView(value as BreakdownViewType)}
          options={[
            {
              label: (
                <span>
                  <TableOutlined style={{ marginRight: 4 }} />
                  表格
                </span>
              ),
              value: 'table',
            },
            {
              label: (
                <span>
                  <PieChartOutlined style={{ marginRight: 4 }} />
                  图表
                </span>
              ),
              value: 'chart',
            },
          ]}
        />
      </div>

      {/* 根据选择显示表格或图表 */}
      {breakdownView === 'table' ? (
        <CostBreakdownTable
          breakdown={result.breakdown}
          metrics={result.metrics}
          monthlyTotal={result.monthly_total}
          pricingMetadata={result.pricing_metadata}
          region={region}
          storageClass={(schemeInfo?.technical.storage_class || STORAGE_CLASS_DEFAULTS.primary) as StorageClass}
          deviceCount={result.device_count}
          retentionDays={retentionDays}
          accessPattern={accessPattern}
          detailedBreakdown={result.detailed_breakdown ? {
            storageCosts: result.detailed_breakdown.storage_costs?.map(c => ({
              name: c.name,
              unitPrice: c.unit_price,
              unitPriceUnit: c.unit_price_unit,
              quantity: c.quantity,
              quantityUnit: c.quantity_unit,
              amount: c.amount,
            })),
            dataTransferTiers: result.detailed_breakdown.data_transfer_tiers?.map(t => ({
              tierName: t.tier_name,
              rangeStartGb: t.range_start_gb,
              rangeEndGb: t.range_end_gb,
              unitPrice: t.unit_price,
              quantityGb: t.quantity_gb,
              amount: t.amount,
            })),
          } : undefined}
        />
      ) : (
        <div style={{ padding: '16px 0' }}>
          <CostPieChart breakdown={result.breakdown} />
        </div>
      )}
    </div>
  );
};

export default BreakdownContent;
