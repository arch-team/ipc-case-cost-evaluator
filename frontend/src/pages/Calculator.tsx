/**
 * 成本计算页面
 */
import React, { useState } from 'react';
import { Card, Steps, Button, message, Row, Col } from 'antd';
import type {
  CostCalculationInput,
  CostSummary,
  ComparisonResult,
} from '../types';
import { calculatorApi, exportApi } from '../api/client';
import FunctionalForm from '../components/calculator/FunctionalForm';
import TechnicalForm from '../components/calculator/TechnicalForm';
import PricingForm from '../components/calculator/PricingForm';
import ResultDisplay from '../components/calculator/ResultDisplay';
import ComparisonDisplay from '../components/comparison/ComparisonDisplay';
import ScenarioSelector from '../components/calculator/ScenarioSelector';

const Calculator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState<CostCalculationInput>({
    functional: {
      device_count: 100,
      recording_mode: 'event_triggered',
      video_quality: '1080p',
      events_per_day: 400,
      event_duration_sec: 15,
      retention_days: 30,
      access_pattern: 0.1,
    },
    technical: {
      storage_class: 'STANDARD',
    },
    pricing: {
      region: 'ap-northeast-1',
      discount_percent: 0,
    },
  });
  const [result, setResult] = useState<CostSummary | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  const steps = [
    { title: '选择场景', description: '快速开始或自定义' },
    { title: '功能配置', description: '设备和录像参数' },
    { title: '技术选项', description: '存储类型' },
    { title: '价格设置', description: '区域和折扣' },
    { title: '计算结果', description: '成本分析' },
  ];

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const [calcResult, compResult] = await Promise.all([
        calculatorApi.calculate(input),
        calculatorApi.compare(input),
      ]);
      setResult(calcResult);
      setComparison(compResult);
      setCurrentStep(4);
    } catch (error) {
      message.error('计算失败，请检查输入参数');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    try {
      const blob = await exportApi.exportExcel({
        input_data: input,
        result: {
          ...result,
          breakdown: result.breakdown,
          metrics: result.metrics ? {
            monthly_storage_gb: result.metrics.avg_storage_gb,
            monthly_puts: result.metrics.monthly_puts,
            monthly_gets: result.metrics.monthly_gets,
            monthly_retrieval_gb: result.metrics.monthly_retrieval_gb,
            monthly_transfer_gb: result.metrics.monthly_transfer_gb,
          } : undefined,
        } as any,
        comparison: comparison || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost_evaluation_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
      console.error(error);
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      handleCalculate();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setResult(null);
    setComparison(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <ScenarioSelector
            onSelect={(selectedInput) => {
              setInput(selectedInput);
              setCurrentStep(1);
            }}
            onCustom={() => setCurrentStep(1)}
          />
        );
      case 1:
        return (
          <FunctionalForm
            value={input.functional}
            onChange={(functional) => setInput({ ...input, functional })}
          />
        );
      case 2:
        return (
          <TechnicalForm
            value={input.technical}
            onChange={(technical) => setInput({ ...input, technical })}
            retentionDays={input.functional.retention_days}
          />
        );
      case 3:
        return (
          <PricingForm
            value={input.pricing}
            onChange={(pricing) => setInput({ ...input, pricing })}
          />
        );
      case 4:
        return (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              {result && <ResultDisplay result={result} onExport={handleExport} />}
            </Col>
            <Col span={24}>
              {comparison && <ComparisonDisplay comparison={comparison} />}
            </Col>
          </Row>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Steps current={currentStep} items={steps} />
      </Card>

      <Card>
        {renderStepContent()}

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          {currentStep > 0 && currentStep < 4 && (
            <Button style={{ marginRight: 8 }} onClick={handlePrev}>
              上一步
            </Button>
          )}
          {currentStep > 0 && currentStep < 4 && (
            <Button type="primary" onClick={handleNext} loading={loading}>
              {currentStep === 3 ? '开始计算' : '下一步'}
            </Button>
          )}
          {currentStep === 4 && (
            <Button type="primary" onClick={handleReset}>
              重新计算
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Calculator;
