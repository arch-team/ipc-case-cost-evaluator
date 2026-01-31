/**
 * 保存核算记录对话框组件
 *
 * 用于收集记录名称和描述，确认保存核算记录
 */
import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface SaveRecordDialogProps {
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}

const SaveRecordDialog: React.FC<SaveRecordDialogProps> = ({
  visible,
  loading,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await onSave(values.name.trim(), values.description?.trim() || '');

      form.resetFields();
      message.success('核算记录保存成功');
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误，不需要额外提示
        return;
      }
      message.error(error.message || '保存失败，请重试');
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
            placeholder="例如：2026年1月 - 10台设备评估"
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
