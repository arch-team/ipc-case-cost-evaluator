/**
 * 用户角色编辑组件
 */
import React, { useState } from 'react';
import { Modal, Form, Select, message, Alert } from 'antd';
import { adminApi } from '../../api/adminApi';
import type { User, AdminUserUpdateRequest } from '../../types/auth';
import { ROLE_LABELS, STATUS_LABELS } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';

interface UserRoleEditorProps {
  user: User;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UserRoleEditor: React.FC<UserRoleEditorProps> = ({
  user,
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const isSelf = currentUser?.id === user.id;

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const updateData: AdminUserUpdateRequest = {};

    if (values.role !== user.role) {
      updateData.role = values.role;
    }
    if (values.status !== user.status) {
      updateData.status = values.status;
    }

    if (!updateData.role && !updateData.status) {
      message.info('没有修改');
      onClose();
      return;
    }

    setLoading(true);
    try {
      await adminApi.updateUser(user.id, updateData);
      message.success('用户信息已更新');
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '更新失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`编辑用户: ${user.name}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="保存"
      cancelText="取消"
    >
      {isSelf && (
        <Alert
          message="您不能修改自己的角色或状态"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          role: user.role,
          status: user.status,
        }}
      >
        <Form.Item label="邮箱">
          <span>{user.email}</span>
        </Form.Item>

        <Form.Item name="role" label="角色">
          <Select disabled={isSelf}>
            <Select.Option value="admin">{ROLE_LABELS.admin}</Select.Option>
            <Select.Option value="user">{ROLE_LABELS.user}</Select.Option>
            <Select.Option value="viewer">{ROLE_LABELS.viewer}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="status" label="状态">
          <Select disabled={isSelf}>
            <Select.Option value="active">{STATUS_LABELS.active}</Select.Option>
            <Select.Option value="disabled">{STATUS_LABELS.disabled}</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserRoleEditor;
