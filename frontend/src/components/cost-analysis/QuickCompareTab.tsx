/**
 * 快速对比 Tab 组件
 *
 * 从原 Calculator 页面提取，提供：
 * - 实时多方案成本对比
 * - 敏感度分析
 * - 不保存记录
 */
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Empty, Spin, Badge, message } from 'antd';
import { SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginPrompt from '../auth/LoginPrompt';
import type {
  CostCalculationInput,
  ComparisonResult,
  MultiTechnicalConfig,
  VideoQuality,
  BatchCalculationResult,
} from '../../types';
import { calculatorApi } from '../../api/client';
import { createInitialMultiConfig } from '../calculator/MultiSchemePanel';
import InputPanel from '../calculator/InputPanel';
import ResultDisplay from '../calculator/ResultDisplay';
import ResultTabs from '../calculator/ResultTabs';
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
  const [allResults, setAllResults] = useState<BatchCalculationResult[]>([]);  // 所有方案结果
  const [selectedSchemeIndex, setSelectedSchemeIndex] = useState<number>(0);   // 当前选中方案索引
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [status, setStatus] = useState<CalculationStatus>('idle');

  // 派生当前选中方案的计算结果
  const currentSchemeResult = useMemo(() => {
    return allResults[selectedSchemeIndex] ?? null;
  }, [allResults, selectedSchemeIndex]);

  // 派生当前方案的 CostSummary（用于兼容现有组件）
  const result = useMemo(() => {
    return currentSchemeResult?.result ?? null;
  }, [currentSchemeResult]);

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

  // 实时计算的防抖函数 - 单方案模式（保留兼容性，转换为 allResults 格式）
  const calculateSingleDebounced = useMemo(
    () =>
      debounce(async (inputData: CostCalculationInput) => {
        setStatus('calculating');
        try {
          const [calcResult, compResult] = await Promise.all([
            calculatorApi.calculate(inputData),
            calculatorApi.compare(inputData),
          ]);
          // 转换为 allResults 格式以保持状态一致
          setAllResults([{
            schemeId: 'single',
            schemeName: '当前方案',
            result: calcResult,
            technical: inputData.technical,
            retention_days: inputData.functional.retention_days,
          }]);
          setSelectedSchemeIndex(0);
          setComparison(compResult);
          setStatus('success');
        } catch (error) {
          devLog.error('计算失败:', error);
          setAllResults([]);
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
          setAllResults(results);

          // 自动选择推荐方案（成本最低）
          if (compResult && compResult.items.length > 0) {
            const recommendedIndex = compResult.items.findIndex(item => item.is_recommended);
            setSelectedSchemeIndex(recommendedIndex >= 0 ? recommendedIndex : 0);
          } else {
            setSelectedSchemeIndex(0);
          }
          setStatus('success');
        } catch (error) {
          devLog.error('批量计算失败:', error);
          setAllResults([]);
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

  // 处理方案切换
  const handleSchemeSelect = (index: number) => {
    if (index >= 0 && index < allResults.length) {
      setSelectedSchemeIndex(index);
    }
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

    // 判断当前方案是否为推荐方案
    const isCurrentRecommended = comparison?.items[selectedSchemeIndex]?.is_recommended ?? false;

    return (
      <Spin spinning={status === 'calculating'} tip="计算中...">
        {result && (
          <>
            {/* 区域1：决策摘要 - Hero 区域 + 副指标栏 + 费用明细 + 使用量指标 */}
            <ResultDisplay
              result={result}
              schemeInfo={currentSchemeResult ? {
                id: currentSchemeResult.schemeId,
                name: currentSchemeResult.schemeName,
                technical: currentSchemeResult.technical,
              } : undefined}
              isRecommended={isCurrentRecommended}
              region={input.pricing.region}
              retentionDays={input.functional.retention_days}
              accessPattern={input.functional.access_pattern}
              onExport={handleExport}
            />

            {/* 区域2：详细分析 Tab - 方案对比 / 敏感度分析 */}
            <ResultTabs
              result={result}
              comparison={comparison}
              input={input}
              region={input.pricing.region}
              schemeInfo={currentSchemeResult ? {
                id: currentSchemeResult.schemeId,
                name: currentSchemeResult.schemeName,
                technical: currentSchemeResult.technical,
              } : undefined}
              selectedSchemeIndex={selectedSchemeIndex}
              onSchemeSelect={handleSchemeSelect}
              onApplySensitivityValue={handleApplySensitivityValue}
            />
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
