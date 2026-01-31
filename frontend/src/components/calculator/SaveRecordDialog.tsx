/**
 * 保存核算记录对话框组件
 *
 * 用于收集记录名称和描述，确认保存核算记录
 * 支持根据输入参数和计算结果自动生成默认名称
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { CostCalculationInput } from '../../types';
import type { DetailedCalculationResult } from '../../types/calculationRecords';
import { recordingModeLabels } from '../../utils/enumLabels';
import { getStorageStrategyLabel } from '../../constants/storageStrategies';

const { TextArea } = Input;

interface SaveRecordDialogProps {
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  /** 当前输入参数，用于生成默认名称 */
  input?: CostCalculationInput | null;
  /** 计算结果，用于生成默认名称 */
  result?: DetailedCalculationResult | null;
}

/**
 * 生成默认记录名称
 * 格式：{设备数}台-{录像模式}-{存储策略}-${月成本}
 */
function generateDefaultName(
  input: CostCalculationInput | null | undefined,
  result: DetailedCalculationResult | null | undefined
): string {
  if (!input || !result) return '';

  const parts: string[] = [];

  // 设备数量
  const deviceCount = input.functional.device_count;
  parts.push(`${deviceCount}台`);

  // 录像模式（简短版本）
  const modeLabel = recordingModeLabels[input.functional.recording_mode] || input.functional.recording_mode;
  parts.push(modeLabel);

  // 存储策略（简短版本）
  const strategyLabel = getStorageStrategyLabel(result.storage_strategy, 'short');
  parts.push(strategyLabel);

  // 月度成本
  const totalCost = result.summary.total_cost;
  const costStr = totalCost >= 1000
    ? `$${(totalCost / 1000).toFixed(1)}K`
    : `$${totalCost.toFixed(2)}`;
  parts.push(costStr);

  return parts.join('-');
}

const SaveRecordDialog: React.FC<SaveRecordDialogProps> = ({
  visible,
  loading,
  onCancel,
  onSave,
  input,
  result,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 当对话框打开时，生成默认名称
  const setDefaultName = useCallback(() => {
    const defaultName = generateDefaultName(input, result);
    if (defaultName) {
      form.setFieldsValue({ name: defaultName });
    }
  }, [form, input, result]);

  useEffect(() => {
    if (visible) {
      setDefaultName();
    }
  }, [visible, setDefaultName]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await onSave(values.name.trim(), values.description?.trim() || '');

      form.resetFields();
      message.success('核算记录保存成功');
    } catch (error: unknown) {
      const formError = error as { errorFields?: unknown[] };
      if (formError.errorFields) {
        // 表单验证错误，不需要额外提示
        return;
      }
      const errMsg = error as { message?: string };
      message.error(errMsg.message || '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <span>
          <SaveOutlined style={{ marginRight: 8 }} />
          保存核算记录
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading || submitting}
      okText="保存"
      cancelText="取消"
      width={480}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="记录名称"
          rules={[
            { required: true, message: '请输入记录名称' },
            { max: 100, message: '记录名称不能超过100个字符' },
            {
              pattern: /^[^<>]*$/,
              message: '记录名称不能包含 < 或 > 字符',
            },
          ]}
        >
          <Input
            placeholder="例如：10台-事件触发-S3标准-$4.63"
            maxLength={100}
            showCount
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述（可选）"
          rules={[
            { max: 500, message: '描述不能超过500个字符' },
          ]}
        >
          <TextArea
            placeholder="添加备注说明，方便日后回顾"
            rows={3}
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveRecordDialog;
