/**
 * 结果详细分析 Tab 容器组件
 * 整合费用明细、方案对比、敏感度分析三个视图
 */
import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import {
  PieChartOutlined,
  SwapOutlined,
  SlidersOutlined,
} from '@ant-design/icons';
import type {
  CostSummary,
  ComparisonResult,
  CostCalculationInput,
  TechnicalDimensions,
  UsageMetrics,
} from '../../types';
import BreakdownContent from './BreakdownContent';
import ComparisonPanel from '../comparison/ComparisonPanel';
import SensitivityAnalysis from './SensitivityAnalysis';

interface SchemeInfo {
  id: string;
  name: string;
  technical: TechnicalDimensions;
}

interface ResultTabsProps {
  result: CostSummary;
  comparison: ComparisonResult | null;
  input: CostCalculationInput;
  region: string;
  schemeInfo?: SchemeInfo;
  metrics?: UsageMetrics;
  onApplySensitivityValue?: (field: string, value: string | number) => void;
}

const ResultTabs: React.FC<ResultTabsProps> = ({
  result,
  comparison,
  input,
  region,
  schemeInfo,
  onApplySensitivityValue,
}) => {
  const [activeKey, setActiveKey] = useState('breakdown');

  const items = [
    {
      key: 'breakdown',
      label: (
        <span>
          <PieChartOutlined />
          费用明细
        </span>
      ),
      children: (
        <BreakdownContent
          result={result}
          schemeInfo={schemeInfo}
          region={region}
          retentionDays={input.functional.retention_days}
          accessPattern={input.functional.access_pattern}
        />
      ),
    },
    {
      key: 'comparison',
      label: (
        <span>
          <SwapOutlined />
          方案对比
        </span>
      ),
      children: comparison ? (
        <ComparisonPanel
          comparison={comparison}
          metrics={result.metrics}
          deviceCount={result.device_count}
          region={region}
        />
      ) : (
        <div className="result-tabs-empty">暂无方案对比数据</div>
      ),
    },
    {
      key: 'sensitivity',
      label: (
        <span>
          <SlidersOutlined />
          敏感度分析
        </span>
      ),
      children: (
        <SensitivityAnalysis
          input={input}
          baselineCost={result.monthly_total}
          onApplyValue={onApplySensitivityValue}
        />
      ),
    },
  ];

  return (
    <Card className="result-tabs">
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items}
        destroyInactiveTabPane={false}
      />
    </Card>
  );
};

export default ResultTabs;
