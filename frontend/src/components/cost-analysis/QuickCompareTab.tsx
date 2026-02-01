/**
 * 快速对比 Tab 组件
 *
 * 从原 Calculator 页面提取，提供：
 * - 实时多方案成本对比
 * - 敏感度分析
 * - 不保存记录
 */
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Card, Empty, Spin, Badge, message } from 'antd';
import { SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginPrompt from '../auth/LoginPrompt';
import type {
  CostCalculationInput,
  CostSummary,
  ComparisonResult,
  MultiTechnicalConfig,
  VideoQuality,
  BatchCalculationResult,
} from '../../types';
import { calculatorApi } from '../../api/client';
import { createInitialMultiConfig } from '../calculator/MultiSchemePanel';
import InputPanel from '../calculator/InputPanel';
import ResultDisplay from '../calculator/ResultDisplay';
import ComparisonPanel from '../comparison/ComparisonPanel';
import SensitivityAnalysis from '../calculator/SensitivityAnalysis';
import ExportDialog from '../calculator/ExportDialog';
import ShareDialog from '../calculator/ShareDialog';
import debounce from 'lodash/debounce';
import { devLog } from '../../utils/errors';

// 计算状态
type CalculationStatus = 'idle' | 'calculating' | 'success' | 'error';

interface QuickCompareTabProps {
  /** 输入参数（共享状态） */
  input: CostCalculationInput;
  /** 输入参数变化回调 */
  onInputChange: (input: CostCalculationInput) => void;
}

const QuickCompareTab: React.FC<QuickCompareTabProps> = ({
  input,
  onInputChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const loadedFromEvaluation = useRef(false);

  // 多方案配置状态
  const [multiConfig, setMultiConfig] = useState<MultiTechnicalConfig>(createInitialMultiConfig());
  const [useMultiScheme] = useState<boolean>(true);

  // 计算结果状态
  const [result, setResult] = useState<CostSummary | null>(null);
  const [currentSchemeResult, setCurrentSchemeResult] = useState<BatchCalculationResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [status, setStatus] = useState<CalculationStatus>('idle');

  // 对话框状态
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [evaluationId] = useState<string | undefined>();

  // 访客模式提示关闭状态
  const [guestAlertDismissed, setGuestAlertDismissed] = useState(() => {
    return localStorage.getItem('guestAlertDismissed') === 'true';
  });

  // 处理从评估历史加载的数据
  useLayoutEffect(() => {
    const state = location.state as { loadFromEvaluation?: { input_data: CostCalculationInput } } | null;
    if (state?.loadFromEvaluation && !loadedFromEvaluation.current) {
      loadedFromEvaluation.current = true;
      const loadedInput = state.loadFromEvaluation.input_data;
      onInputChange(loadedInput);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, onInputChange]);

  // 实时计算的防抖函数 - 单方案模式
  const calculateSingleDebounced = useMemo(
    () =>
      debounce(async (inputData: CostCalculationInput) => {
        setStatus('calculating');
        try {
          const [calcResult, compResult] = await Promise.all([
            calculatorApi.calculate(inputData),
            calculatorApi.compare(inputData),
          ]);
          setResult(calcResult);
          setComparison(compResult);
          setStatus('success');
        } catch (error) {
          devLog.error('计算失败:', error);
          setStatus('error');
        }
      }, 500),
    []
  );

  // 实时计算的防抖函数 - 多方案模式
  const calculateMultiDebounced = useMemo(
    () =>
      debounce(async (inputData: CostCalculationInput, config: MultiTechnicalConfig) => {
        setStatus('calculating');
        try {
          const { results, comparison: compResult } = await calculatorApi.batchCalculate(
            inputData.functional,
            inputData.pricing,
            config.schemes
          );
          setComparison(compResult);
          if (results.length > 0) {
            setResult(results[0].result);
            setCurrentSchemeResult(results[0]);
          } else {
            setResult(null);
            setCurrentSchemeResult(null);
          }
          setStatus('success');
        } catch (error) {
          devLog.error('批量计算失败:', error);
          setStatus('error');
        }
      }, 500),
    []
  );

  // 输入变化时自动计算
  useEffect(() => {
    if (useMultiScheme) {
      calculateMultiDebounced(input, multiConfig);
    } else {
      calculateSingleDebounced(input);
    }
  }, [input, multiConfig, useMultiScheme, calculateSingleDebounced, calculateMultiDebounced]);

  // 处理参数变化
  const handleInputChange = (newInput: CostCalculationInput) => {
    onInputChange(newInput);
  };

  // 处理多方案配置变化
  const handleMultiConfigChange = (config: MultiTechnicalConfig) => {
    setMultiConfig(config);
  };

  // 处理敏感度分析中的值应用
  const handleApplySensitivityValue = (field: string, value: string | number) => {
    const newInput = { ...input };
    if (field === 'access_pattern' && typeof value === 'number') {
      newInput.functional = { ...newInput.functional, access_pattern: value };
    } else if (field === 'video_quality' && typeof value === 'string') {
      newInput.functional = { ...newInput.functional, video_quality: value as VideoQuality };
    } else if (field === 'device_count' && typeof value === 'number') {
      newInput.functional = { ...newInput.functional, device_count: value };
    } else if (field === 'retention_days' && typeof value === 'number') {
      newInput.functional = { ...newInput.functional, retention_days: value };
    }
    onInputChange(newInput);
    message.success('已应用新参数值');
  };

  // 处理导出
  const handleExport = () => {
    if (!result) {
      message.warning('请先完成计算');
      return;
    }
    setExportDialogOpen(true);
  };

  // 处理分享
  const handleShare = () => {
    setShareDialogOpen(true);
  };

  // 处理保存 - 跳转到详细评估 Tab
  const handleSave = () => {
    if (!isAuthenticated) {
      message.info({
        content: (
          <span>
            登录后可保存记录
            <a
              onClick={() => navigate('/settings')}
              style={{ marginLeft: 8, color: '#1890ff' }}
            >
              去登录
            </a>
          </span>
        ),
        duration: 4,
      });
      return;
    }
    // 跳转到详细评估 Tab
    navigate('/cost-analysis?tab=detailed');
  };

  // 处理关闭访客模式提示
  const handleDismissGuestAlert = () => {
    setGuestAlertDismissed(true);
    localStorage.setItem('guestAlertDismissed', 'true');
  };

  // 渲染登录提示
  const renderLoginPrompt = () => {
    if (isAuthenticated || guestAlertDismissed) return null;

    return (
      <LoginPrompt
        variant="mini"
        closable
        onClose={handleDismissGuestAlert}
      />
    );
  };

  // 渲染计算状态指示器
  const renderStatusIndicator = () => {
    switch (status) {
      case 'calculating':
        return (
          <span className="calculation-status calculating">
            <SyncOutlined spin /> 计算中
          </span>
        );
      case 'success':
        return (
          <span className="calculation-status success">
            <Badge status="success" /> 实时计算
          </span>
        );
      case 'error':
        return (
          <span className="calculation-status error">
            <ExclamationCircleOutlined /> 参数错误
          </span>
        );
      default:
        return (
          <span className="calculation-status idle">
            <Badge status="default" /> 等待输入
          </span>
        );
    }
  };

  // 渲染结果区域
  const renderResultArea = () => {
    if (status === 'idle' && !result) {
      return (
        <div className="result-placeholder">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="调整左侧参数后，计算结果将在此处显示"
          />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="result-placeholder error">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="参数验证失败，请检查输入"
          />
        </div>
      );
    }

    return (
      <Spin spinning={status === 'calculating'} tip="计算中...">
        {result && (
          <>
            {/* 费用汇总卡片 */}
            <ResultDisplay
              result={result}
              schemeInfo={currentSchemeResult ? {
                id: currentSchemeResult.schemeId,
                name: currentSchemeResult.schemeName,
                technical: currentSchemeResult.technical,
              } : undefined}
              region={input.pricing.region}
              retentionDays={input.functional.retention_days}
              accessPattern={input.functional.access_pattern}
              onExport={handleExport}
            />

            {/* 方案对比 */}
            {comparison && (
              <div style={{ marginTop: 24 }}>
                <ComparisonPanel
                  comparison={comparison}
                  metrics={result.metrics}
                  deviceCount={result.device_count}
                  region={input.pricing.region}
                />
              </div>
            )}

            {/* 敏感度分析 */}
            <div style={{ marginTop: 24 }}>
              <Card className="sensitivity-card">
                <SensitivityAnalysis
                  input={input}
                  baselineCost={result.monthly_total}
                  onApplyValue={handleApplySensitivityValue}
                />
              </Card>
            </div>
          </>
        )}
      </Spin>
    );
  };

  return (
    <div className="quick-compare-tab">
      {/* 登录提示 */}
      {renderLoginPrompt()}

      {/* 状态指示器 */}
      <div className="calculator-page-header" style={{ marginBottom: 16 }}>
        {renderStatusIndicator()}
      </div>

      {/* 双栏布局 */}
      <div className="calculator-layout">
        {/* 左侧：参数输入区 */}
        <aside className="calculator-input-panel">
          <InputPanel
            value={input}
            onChange={handleInputChange}
            multiConfig={multiConfig}
            onMultiConfigChange={handleMultiConfigChange}
            useMultiScheme={useMultiScheme}
            onExport={handleExport}
            onShare={handleShare}
            onSave={handleSave}
            isLoggedIn={isAuthenticated}
          />
        </aside>

        {/* 右侧：结果展示区 */}
        <main className="calculator-result-panel">{renderResultArea()}</main>
      </div>

      {/* 导出对话框 */}
      {result && (
        <ExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          input={input}
          result={result}
          comparison={comparison}
        />
      )}

      {/* 分享对话框 */}
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        evaluationId={evaluationId}
        isLoggedIn={isAuthenticated}
        onNeedSave={handleSave}
      />
    </div>
  );
};

export default QuickCompareTab;
