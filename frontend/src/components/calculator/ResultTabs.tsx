/**
 * 结果详细分析 Tab 容器组件
 * 整合方案对比和敏感度分析两个视图
 * 费用明细已移至 ResultDisplay 组件中
 */
import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import {
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
  selectedSchemeIndex?: number;  // 当前选中的方案索引
  onSchemeSelect?: (index: number) => void;  // 方案切换回调
  onApplySensitivityValue?: (field: string, value: string | number) => void;
}

const ResultTabs: React.FC<ResultTabsProps> = ({
  result,
  comparison,
  input,
  region,
  selectedSchemeIndex = 0,
  onSchemeSelect,
  onApplySensitivityValue,
}) => {
  const [activeKey, setActiveKey] = useState('comparison');

  const items = [
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
          selectedSchemeIndex={selectedSchemeIndex}
          onSchemeSelect={onSchemeSelect}
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
