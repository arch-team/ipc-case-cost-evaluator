/**
 * 详细核算页面 - 独立页面
 *
 * 提供完整的成本计算和详细核算功能：
 * - 左侧：参数输入面板
 * - 右侧：详细核算预览（中间指标、分阶段费用、费用汇总）
 * - 支持保存核算记录
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Typography, message, Button, Space, InputNumber, Tooltip } from 'antd';
import {
  CalculatorOutlined,
  SaveOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import LoginPrompt from '../components/auth/LoginPrompt';
import type { CostCalculationInput } from '../types';
import type { DetailedCalculationResult } from '../types/calculationRecords';
import { calculationRecordApi } from '../api/calculationRecords';
import FunctionalForm from '../components/calculator/FunctionalForm';
import TechnicalForm from '../components/calculator/TechnicalForm';
import PricingForm from '../components/calculator/PricingForm';
import DetailedCostPreview from '../components/calculator/DetailedCostPreview';
import SaveRecordDialog from '../components/calculator/SaveRecordDialog';
import debounce from 'lodash/debounce';
import { STORAGE_CLASS_DEFAULTS } from '../constants/storageClasses';
import { devLog } from '../utils/errors';

const { Title, Text } = Typography;

// 计算状态
type CalculationStatus = 'idle' | 'calculating' | 'success' | 'error';

const DetailedCalculation: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // 输入参数状态
  const [input, setInput] = useState<CostCalculationInput>({
    functional: {
      device_count: 10,
      recording_mode: 'event_triggered',
      video_quality: '1080p',
      events_per_day: 50,
      event_duration_sec: 30,
      retention_days: 30,
      access_pattern: 0.1,
    },
    technical: {
      storage_class: STORAGE_CLASS_DEFAULTS.primary,
    },
    pricing: {
      region: 'us-east-1',
      discount_percent: 0,
    },
  });

  // 计算结果状态
  const [detailedResult, setDetailedResult] = useState<DetailedCalculationResult | null>(null);
  const [previousResult, setPreviousResult] = useState<DetailedCalculationResult | null>(null);
  const [status, setStatus] = useState<CalculationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // 对话框状态
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // 使用 ref 追踪最新的 detailedResult，避免 useMemo 依赖循环
  const detailedResultRef = useRef(detailedResult);
  useEffect(() => {
    detailedResultRef.current = detailedResult;
  }, [detailedResult]);

  // 用户记录数量
  const [userRecordCount, setUserRecordCount] = useState<number>(0);

  // 加载默认参数
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const defaults = await calculationRecordApi.getDefaults();
        setInput(defaults);
      } catch (err) {
        devLog.error('加载默认参数失败:', err);
      }
    };
    loadDefaults();
  }, []);

  // 获取用户记录数量
  useEffect(() => {
    const fetchRecordCount = async () => {
      if (isAuthenticated) {
        try {
          const countRes = await calculationRecordApi.getCount();
          setUserRecordCount(countRes.count);
        } catch (err) {
          devLog.error('获取记录数量失败:', err);
        }
      }
    };
    fetchRecordCount();
  }, [isAuthenticated]);

  // 实时计算的防抖函数
  // 使用 ref 而非 state 作为依赖，避免无限循环
  const calculateDebounced = useMemo(
    () =>
      debounce(async (inputData: CostCalculationInput) => {
        setStatus('calculating');
        setError(null);
        try {
          const result = await calculationRecordApi.calculateDetailed(inputData);
          if (detailedResultRef.current) {
            setPreviousResult(detailedResultRef.current);
          }
          setDetailedResult(result);
          setStatus('success');
        } catch (err: unknown) {
          devLog.error('计算失败:', err);
          const errorMessage = err instanceof Error
            ? (err as Error & { response?: { data?: { detail?: string } } }).response?.data?.detail || err.message
            : '计算失败';
          setError(errorMessage);
          setStatus('error');
        }
      }, 500),
    [] // 空依赖数组，防抖函数只创建一次
  );

  // 输入变化时自动计算
  useEffect(() => {
    calculateDebounced(input);
  }, [input, calculateDebounced]);

  // 处理输入变化
  const handleFunctionalChange = (functional: CostCalculationInput['functional']) => {
    setInput((prev) => ({ ...prev, functional }));
  };

  const handleTechnicalChange = (technical: CostCalculationInput['technical']) => {
    setInput((prev) => ({ ...prev, technical }));
  };

  const handlePricingChange = (pricing: CostCalculationInput['pricing']) => {
    setInput((prev) => ({ ...prev, pricing }));
  };

  // 处理保存
  const handleSave = () => {
    if (!isAuthenticated) {
      message.warning('请先登录后再保存核算记录');
      return;
    }
    if (!detailedResult) {
      message.warning('请等待计算完成后再保存');
      return;
    }
    if (userRecordCount >= 1000) {
      message.error('已达到记录数量上限 (1000条)，请删除旧记录后再保存');
      return;
    }
    setSaveDialogOpen(true);
  };

  // 执行保存
  const handleSaveRecord = async (name: string, description: string) => {
    setSaveLoading(true);
    try {
      await calculationRecordApi.create({ name, description }, input);
      setSaveDialogOpen(false);
      setUserRecordCount((prev) => prev + 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? (err as Error & { response?: { data?: { detail?: string } } }).response?.data?.detail || err.message
        : '保存失败';
      throw new Error(errorMessage);
    } finally {
      setSaveLoading(false);
    }
  };

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    switch (status) {
      case 'calculating':
        return (
          <span style={{ color: '#1890ff' }}>
            <SyncOutlined spin /> 计算中...
          </span>
        );
      case 'success':
        return (
          <span style={{ color: '#52c41a' }}>
            <CheckCircleOutlined /> 计算完成
          </span>
        );
      case 'error':
        return (
          <span style={{ color: '#ff4d4f' }}>
            <ExclamationCircleOutlined /> 计算错误
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="detailed-calculation-page">
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            <CalculatorOutlined style={{ marginRight: 8 }} />
            详细成本核算
          </Title>
          <Space>
            {renderStatusIndicator()}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              disabled={!detailedResult || status === 'calculating'}
            >
              保存记录
            </Button>
          </Space>
        </div>
        <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          输入参数后自动计算详细成本，包含中间计算指标和分阶段费用明细
        </Text>
      </div>

      {/* 未登录提示 */}
      {!isAuthenticated && (
        <LoginPrompt
          variant="alert"
          title="访客模式"
          description="您正在以访客身份使用，可正常计算但无法保存记录。"
          trigger="save"
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 双栏布局 */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* 左侧：参数输入 */}
        <div style={{ width: 400, flexShrink: 0 }}>
          <Card title="功能维度" size="small" style={{ marginBottom: 16 }}>
            <FunctionalForm
              value={input.functional}
              onChange={handleFunctionalChange}
            />
          </Card>

          <Card title="技术维度" size="small" style={{ marginBottom: 16 }}>
            {/* 保留天数 - 与 Calculator 页面保持一致 */}
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed #e8e8e8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClockCircleOutlined style={{ fontSize: 14, color: '#2563eb' }} />
                <Text style={{ fontSize: 13 }}>默认保留天数</Text>
                <InputNumber
                  size="small"
                  min={1}
                  max={365}
                  value={input.functional.retention_days}
                  onChange={(days) => days && handleFunctionalChange({
                    ...input.functional,
                    retention_days: days,
                  })}
                  style={{ width: 70 }}
                  controls={false}
                />
                <Text type="secondary" style={{ fontSize: 13 }}>天</Text>
                <Tooltip title="数据保留期限，影响存储成本计算">
                  <QuestionCircleOutlined style={{ fontSize: 12, color: '#999', cursor: 'help' }} />
                </Tooltip>
              </div>
            </div>
            <TechnicalForm
              value={input.technical}
              onChange={handleTechnicalChange}
              retentionDays={input.functional.retention_days}
              region={input.pricing.region}
            />
          </Card>

          <Card title="价格维度" size="small">
            <PricingForm
              value={input.pricing}
              onChange={handlePricingChange}
            />
          </Card>
        </div>

        {/* 右侧：详细核算预览 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DetailedCostPreview
            result={detailedResult}
            loading={status === 'calculating'}
            error={error}
            previousResult={previousResult}
            input={input}
          />
        </div>
      </div>

      {/* 保存对话框 */}
      <SaveRecordDialog
        visible={saveDialogOpen}
        loading={saveLoading}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={handleSaveRecord}
        input={input}
        result={detailedResult}
      />
    </div>
  );
};

export default DetailedCalculation;
