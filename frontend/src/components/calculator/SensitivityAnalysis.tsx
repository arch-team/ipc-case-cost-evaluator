/**
 * 敏感度分析面板 - 优化版
 * 改进：紧凑布局、条形图可视化、统一交互
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Slider, Typography, Button, Spin, Tooltip } from 'antd';
import { SlidersOutlined, BulbOutlined, CheckOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import type { CostCalculationInput } from '../../types';
import { calculatorApi } from '../../api/client';
import debounce from 'lodash/debounce';

const { Text, Title } = Typography;

interface SensitivityAnalysisProps {
  input: CostCalculationInput;
  baselineCost: number;
  onApplyValue?: (field: string, value: string | number) => void;
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
  const sensitivityItems: SensitivityItem[] = useMemo(() => [
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
          video_quality: (['720p', '1080p', '2K', '4K'] as const)[val] || '1080p',
        },
      }),
    },
  ], [input]);

  // 初始化滑块值
  useEffect(() => {
    const initialValues: Record<string, number> = {};
    sensitivityItems.forEach((item) => {
      initialValues[item.key] = item.currentValue;
    });
    setSliderValues(initialValues);
  }, [sensitivityItems]);

  // 计算单个项目的成本影响（不带防抖）
  const calculateCost = useCallback(
    async (key: string, value: number, item: SensitivityItem) => {
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
    },
    [input, baselineCost]
  );

  // 每个 key 的防抖函数引用
  const debouncedCalculatorsRef = React.useRef<Record<string, ReturnType<typeof debounce>>>({});

  // 获取或创建针对特定 key 的防抖函数
  const getDebouncedCalculator = useCallback(
    (key: string) => {
      if (!debouncedCalculatorsRef.current[key]) {
        debouncedCalculatorsRef.current[key] = debounce(
          (value: number, item: SensitivityItem) => {
            calculateCost(key, value, item);
          },
          300
        );
      }
      return debouncedCalculatorsRef.current[key];
    },
    [calculateCost]
  );

  // 初始化计算各项影响（并行计算所有项目）
  useEffect(() => {
    // 并行计算所有敏感度项目
    sensitivityItems.forEach((item) => {
      calculateCost(item.key, item.currentValue, item);
    });
  }, [sensitivityItems, baselineCost, calculateCost]);

  // 处理滑块变化（使用每个 key 独立的防抖函数）
  const handleSliderChange = (key: string, value: number, item: SensitivityItem) => {
    setSliderValues((prev) => ({ ...prev, [key]: value }));
    const debouncedCalculator = getDebouncedCalculator(key);
    debouncedCalculator(value, item);
  };

  // 计算影响排序
  const impactRanking = useMemo(() => {
    const items = sensitivityItems
      .filter((item) => impacts[item.key])
      .map((item) => ({
        label: item.label,
        impact: impacts[item.key]?.impactRange || 0,
      }))
      .sort((a, b) => b.impact - a.impact);

    return items.map((item) => item.label).join(' > ');
  }, [impacts, sensitivityItems]);

  // 格式化百分比
  const formatPercent = (percent: number) => {
    if (Math.abs(percent) < 0.5) return '0%';
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(0)}%`;
  };

  // 格式化成本
  const formatCost = (cost: number) => {
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 计算条形图宽度（基于成本范围）
  const getBarWidth = (cost: number, minCost: number, maxCost: number) => {
    if (maxCost === minCost) return 50;
    const range = maxCost - minCost;
    const position = ((cost - minCost) / range) * 100;
    return Math.max(5, Math.min(100, position));
  };

  // 应用值到输入
  const handleApplyValue = (item: SensitivityItem, value: number) => {
    if (!onApplyValue) return;

    if (item.key === 'access_pattern') {
      onApplyValue(item.key, value / 100);
    } else if (item.key === 'video_quality') {
      onApplyValue(item.key, ['720p', '1080p', '2K', '4K'][value]);
    } else {
      onApplyValue(item.key, value);
    }
  };

  // 计算所有成本中的最大最小值（用于统一的条形图比例）
  const globalCostRange = useMemo(() => {
    let globalMin = baselineCost;
    let globalMax = baselineCost;

    Object.values(impacts).forEach(impact => {
      globalMin = Math.min(globalMin, impact.minCost);
      globalMax = Math.max(globalMax, impact.maxCost);
    });

    return { min: globalMin, max: globalMax };
  }, [impacts, baselineCost]);

  return (
    <div className="sensitivity-analysis-v2">
      {/* 头部：标题和基准成本 */}
      <div className="sensitivity-header">
        <div className="sensitivity-title">
          <SlidersOutlined />
          <Title level={5} style={{ margin: 0 }}>敏感度分析</Title>
        </div>
        <div className="sensitivity-baseline">
          <Text type="secondary">基准</Text>
          <Text strong className="sensitivity-baseline-cost">{formatCost(baselineCost)}</Text>
          <Text type="secondary">/月</Text>
        </div>
      </div>

      {/* 参数列表 */}
      <div className="sensitivity-items">
        {sensitivityItems.map((item) => {
          const impact = impacts[item.key];
          const currentSliderValue = sliderValues[item.key] ?? item.currentValue;
          const isLoading = loading[item.key];
          const hasChanged = currentSliderValue !== item.currentValue;
          const displayValue = item.formatValue
            ? item.formatValue(currentSliderValue)
            : `${currentSliderValue} ${item.unit}`;

          return (
            <div key={item.key} className="sensitivity-row">
              {/* 左侧：参数名和滑块 */}
              <div className="sensitivity-row-left">
                <div className="sensitivity-row-label">
                  <Text strong>{item.label}</Text>
                  <Text className="sensitivity-row-value" type={hasChanged ? 'warning' : 'secondary'}>
                    {displayValue}
                  </Text>
                </div>
                <div className="sensitivity-row-slider">
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
                  />
                  <div className="sensitivity-slider-labels">
                    <span>{item.formatValue ? item.formatValue(item.min) : item.min}</span>
                    <span>{item.formatValue ? item.formatValue(item.max) : item.max}</span>
                  </div>
                </div>
              </div>

              {/* 右侧：成本影响可视化 */}
              <div className="sensitivity-row-right">
                <Spin spinning={isLoading} size="small">
                  {impact ? (
                    <div className="sensitivity-impact">
                      {/* 条形图可视化 */}
                      <div className="sensitivity-bars">
                        {/* 最小值条 */}
                        <Tooltip title={`${item.formatValue ? item.formatValue(item.min) : item.min + item.unit}: ${formatCost(impact.minCost)}`}>
                          <div className="sensitivity-bar-row">
                            <div
                              className="sensitivity-bar sensitivity-bar-min"
                              style={{
                                width: `${getBarWidth(impact.minCost, globalCostRange.min, globalCostRange.max)}%`
                              }}
                            />
                            <span className="sensitivity-bar-label">
                              {formatCost(impact.minCost)}
                              <span className="sensitivity-bar-percent">{formatPercent(impact.minPercent)}</span>
                            </span>
                          </div>
                        </Tooltip>

                        {/* 当前值条（滑块位置对应的成本） */}
                        <div className="sensitivity-bar-row sensitivity-bar-row-baseline">
                          <div
                            className={`sensitivity-bar ${hasChanged ? 'sensitivity-bar-current' : 'sensitivity-bar-baseline'}`}
                            style={{
                              width: `${getBarWidth(impact.currentCost, globalCostRange.min, globalCostRange.max)}%`
                            }}
                          />
                          <span className={`sensitivity-bar-label ${hasChanged ? '' : 'sensitivity-bar-label-baseline'}`}>
                            {formatCost(impact.currentCost)}
                            <span className="sensitivity-bar-percent">
                              {hasChanged
                                ? formatPercent(((impact.currentCost - baselineCost) / baselineCost) * 100)
                                : '基准'}
                            </span>
                          </span>
                        </div>

                        {/* 最大值条 */}
                        <Tooltip title={`${item.formatValue ? item.formatValue(item.max) : item.max + item.unit}: ${formatCost(impact.maxCost)}`}>
                          <div className="sensitivity-bar-row">
                            <div
                              className="sensitivity-bar sensitivity-bar-max"
                              style={{
                                width: `${getBarWidth(impact.maxCost, globalCostRange.min, globalCostRange.max)}%`
                              }}
                            />
                            <span className="sensitivity-bar-label">
                              {formatCost(impact.maxCost)}
                              <span className="sensitivity-bar-percent">{formatPercent(impact.maxPercent)}</span>
                            </span>
                          </div>
                        </Tooltip>
                      </div>

                      {/* 应用按钮 */}
                      {onApplyValue && hasChanged && (
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<CheckOutlined />}
                          className="sensitivity-apply-btn"
                          onClick={() => handleApplyValue(item, currentSliderValue)}
                        >
                          应用
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="sensitivity-impact-placeholder">
                      计算中...
                    </div>
                  )}
                </Spin>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部：影响排序提示 */}
      {impactRanking && (
        <div className="sensitivity-summary">
          <BulbOutlined />
          <Text type="secondary">
            <strong>成本敏感度：</strong>{impactRanking}
            <Tooltip
              title="排序依据：各参数从最小值到最大值变化时，对月度成本的影响幅度（绝对值）。影响越大，该参数越敏感。"
              placement="top"
            >
              <QuestionCircleOutlined style={{ marginLeft: 6, cursor: 'help', color: '#8c8c8c' }} />
            </Tooltip>
          </Text>
        </div>
      )}
    </div>
  );
};

// 获取视频质量索引
function getQualityIndex(quality: string): number {
  const qualities = ['720p', '1080p', '2K', '4K'];
  // 标准化为小写后比较，支持大小写混合输入
  const normalizedQuality = quality.toLowerCase();
  const normalizedQualities = qualities.map(q => q.toLowerCase());
  const index = normalizedQualities.indexOf(normalizedQuality);
  // 如果找不到匹配，默认返回 1080p 的索引
  return index >= 0 ? index : 1;
}

export default SensitivityAnalysis;
