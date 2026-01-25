/**
 * 敏感度分析面板
 * 显示各参数对成本的影响，支持滑块交互
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Slider, Typography, Button, Spin } from 'antd';
import { SlidersOutlined, BulbOutlined } from '@ant-design/icons';
import type { CostCalculationInput } from '../../types';
import { calculatorApi } from '../../api/client';
import debounce from 'lodash/debounce';

const { Text, Title } = Typography;

interface SensitivityAnalysisProps {
  input: CostCalculationInput;
  baselineCost: number;
  onApplyValue?: (field: string, value: any) => void;
}

interface SensitivityItem {
  key: string;
  label: string;
  currentValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  formatValue?: (val: number) => string;
  getInputValue: (val: number, input: CostCalculationInput) => CostCalculationInput;
}

interface CostImpact {
  minCost: number;
  maxCost: number;
  currentCost: number;
  minPercent: number;
  maxPercent: number;
  impactRange: number;
}

const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({
  input,
  baselineCost,
  onApplyValue,
}) => {
  const [impacts, setImpacts] = useState<Record<string, CostImpact>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});

  // 定义敏感度分析项
  const sensitivityItems: SensitivityItem[] = [
    {
      key: 'device_count',
      label: '设备数量',
      currentValue: input.functional.device_count,
      min: Math.max(1, Math.floor(input.functional.device_count * 0.5)),
      max: Math.ceil(input.functional.device_count * 2),
      step: Math.max(1, Math.floor(input.functional.device_count * 0.1)),
      unit: '台',
      getInputValue: (val, inp) => ({
        ...inp,
        functional: { ...inp.functional, device_count: val },
      }),
    },
    {
      key: 'retention_days',
      label: '保留天数',
      currentValue: input.functional.retention_days,
      min: 7,
      max: 90,
      step: 1,
      unit: '天',
      getInputValue: (val, inp) => ({
        ...inp,
        functional: { ...inp.functional, retention_days: val },
      }),
    },
    {
      key: 'access_pattern',
      label: '回看比例',
      currentValue: input.functional.access_pattern * 100,
      min: 0,
      max: 100,
      step: 5,
      unit: '%',
      formatValue: (val) => `${val}%`,
      getInputValue: (val, inp) => ({
        ...inp,
        functional: { ...inp.functional, access_pattern: val / 100 },
      }),
    },
    {
      key: 'video_quality',
      label: '视频质量',
      currentValue: getQualityIndex(input.functional.video_quality),
      min: 0,
      max: 3,
      step: 1,
      unit: '',
      formatValue: (val) => ['720p', '1080p', '2K', '4K'][val] || '',
      getInputValue: (val, inp) => ({
        ...inp,
        functional: {
          ...inp.functional,
          video_quality: (['720p', '1080p', '2k', '4k'][val] as any) || '1080p',
        },
      }),
    },
  ];

  // 初始化滑块值
  useEffect(() => {
    const initialValues: Record<string, number> = {};
    sensitivityItems.forEach((item) => {
      initialValues[item.key] = item.currentValue;
    });
    setSliderValues(initialValues);
  }, [input]);

  // 计算成本的防抖函数
  const calculateCostDebounced = useCallback(
    debounce(async (key: string, value: number, item: SensitivityItem) => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const modifiedInput = item.getInputValue(value, input);
        const result = await calculatorApi.calculate(modifiedInput);

        // 同时计算最小值和最大值的成本
        const minInput = item.getInputValue(item.min, input);
        const maxInput = item.getInputValue(item.max, input);
        const [minResult, maxResult] = await Promise.all([
          calculatorApi.calculate(minInput),
          calculatorApi.calculate(maxInput),
        ]);

        const minPercent = ((minResult.monthly_total - baselineCost) / baselineCost) * 100;
        const maxPercent = ((maxResult.monthly_total - baselineCost) / baselineCost) * 100;

        setImpacts((prev) => ({
          ...prev,
          [key]: {
            minCost: minResult.monthly_total,
            maxCost: maxResult.monthly_total,
            currentCost: result.monthly_total,
            minPercent,
            maxPercent,
            impactRange: Math.abs(maxResult.monthly_total - minResult.monthly_total),
          },
        }));
      } catch (error) {
        console.error('敏感度计算失败:', error);
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    }, 300),
    [input, baselineCost]
  );

  // 初始化计算各项影响
  useEffect(() => {
    sensitivityItems.forEach((item) => {
      calculateCostDebounced(item.key, item.currentValue, item);
    });
  }, [input, baselineCost]);

  // 处理滑块变化
  const handleSliderChange = (key: string, value: number, item: SensitivityItem) => {
    setSliderValues((prev) => ({ ...prev, [key]: value }));
    calculateCostDebounced(key, value, item);
  };

  // 计算影响排序
  const getImpactRanking = () => {
    const items = sensitivityItems
      .filter((item) => impacts[item.key])
      .map((item) => ({
        label: item.label,
        impact: impacts[item.key]?.impactRange || 0,
      }))
      .sort((a, b) => b.impact - a.impact);

    return items.map((item) => item.label).join(' > ');
  };

  // 格式化百分比
  const formatPercent = (percent: number) => {
    if (percent === 0) return '基准';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(0)}%`;
  };

  // 格式化成本
  const formatCost = (cost: number) => {
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="sensitivity-analysis">
      <div className="sensitivity-analysis-header">
        <Title level={5} style={{ margin: 0 }}>
          <SlidersOutlined style={{ marginRight: 8 }} />
          敏感度分析
        </Title>
        <Text type="secondary">基准成本: {formatCost(baselineCost)}/月</Text>
      </div>

      <div className="sensitivity-analysis-content">
        {sensitivityItems.map((item) => {
          const impact = impacts[item.key];
          const currentSliderValue = sliderValues[item.key] ?? item.currentValue;
          const isLoading = loading[item.key];

          return (
            <div key={item.key} className="sensitivity-item">
              <div className="sensitivity-item-header">
                <Text strong>{item.label}</Text>
                <Text type="secondary">
                  当前: {item.formatValue ? item.formatValue(item.currentValue) : `${item.currentValue} ${item.unit}`}
                </Text>
              </div>

              <div className="sensitivity-item-slider">
                <Slider
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={currentSliderValue}
                  onChange={(val) => handleSliderChange(item.key, val, item)}
                  tooltip={{
                    formatter: (val) =>
                      item.formatValue ? item.formatValue(val || 0) : `${val} ${item.unit}`,
                  }}
                  marks={{
                    [item.min]: item.formatValue ? item.formatValue(item.min) : `${item.min}`,
                    [item.currentValue]: '当前',
                    [item.max]: item.formatValue ? item.formatValue(item.max) : `${item.max}`,
                  }}
                />
              </div>

              {impact && (
                <div className="sensitivity-item-costs">
                  <Spin spinning={isLoading} size="small">
                    <div className="sensitivity-cost-range">
                      <div className="sensitivity-cost-item sensitivity-cost-min">
                        <div className="sensitivity-cost-value">{formatCost(impact.minCost)}</div>
                        <div className="sensitivity-cost-percent">
                          {formatPercent(impact.minPercent)}
                        </div>
                      </div>
                      <div className="sensitivity-cost-arrow">→</div>
                      <div className="sensitivity-cost-item sensitivity-cost-current">
                        <div className="sensitivity-cost-value">{formatCost(baselineCost)}</div>
                        <div className="sensitivity-cost-percent">基准</div>
                      </div>
                      <div className="sensitivity-cost-arrow">→</div>
                      <div className="sensitivity-cost-item sensitivity-cost-max">
                        <div className="sensitivity-cost-value">{formatCost(impact.maxCost)}</div>
                        <div className="sensitivity-cost-percent">
                          {formatPercent(impact.maxPercent)}
                        </div>
                      </div>
                    </div>
                  </Spin>
                </div>
              )}

              {onApplyValue && currentSliderValue !== item.currentValue && (
                <div className="sensitivity-item-actions">
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      if (item.key === 'access_pattern') {
                        onApplyValue(item.key, currentSliderValue / 100);
                      } else if (item.key === 'video_quality') {
                        onApplyValue(
                          item.key,
                          ['720p', '1080p', '2k', '4k'][currentSliderValue]
                        );
                      } else {
                        onApplyValue(item.key, currentSliderValue);
                      }
                    }}
                  >
                    应用此值
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(impacts).length > 0 && (
        <div className="sensitivity-analysis-summary">
          <BulbOutlined style={{ marginRight: 8, color: 'var(--color-warning)' }} />
          <Text type="secondary">成本影响排序：{getImpactRanking()}</Text>
        </div>
      )}
    </div>
  );
};

// 获取视频质量索引
function getQualityIndex(quality: string): number {
  const qualities = ['720p', '1080p', '2k', '4k'];
  return qualities.indexOf(quality.toLowerCase());
}

export default SensitivityAnalysis;
