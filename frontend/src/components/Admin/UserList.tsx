/**
 * 用户列表组件
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Input, Select, Space, Button, message, Popconfirm, Tooltip } from 'antd';
import { SearchOutlined, UnlockOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../../api/adminApi';
import type { User, UserRole, UserStatus } from '../../types/auth';
import { ROLE_LABELS, STATUS_LABELS } from '../../types/auth';
import UserRoleEditor from './UserRoleEditor';

const { Search } = Input;

interface UserListProps {
  onUserUpdated?: () => void;
}

const UserList: React.FC<UserListProps> = ({ onUserUpdated }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>();
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>();
  const [search, setSearch] = useState<string>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.listUsers({
        role: roleFilter,
        status: statusFilter,
        search: search || undefined,
      });
      setUsers(response.users);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '获取用户列表失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    // fetchUsers 会在 search 变化时通过 useEffect 自动触发
  };

  const handleUnlock = async (userId: string) => {
    try {
      await adminApi.unlockUser(userId);
      message.success('用户已解锁');
      fetchUsers();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '解锁失败';
      message.error(errorMessage);
    }
  };

  const handleUserUpdated = () => {
    fetchUsers();
    setEditingUser(null);
    onUserUpdated?.();
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => (
        <Tag color={role === 'admin' ? 'red' : role === 'user' ? 'blue' : 'default'}>
          {ROLE_LABELS[role]}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserStatus) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑角色/状态">
            <Button size="small" onClick={() => setEditingUser(record)}>
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认解锁该用户?"
            onConfirm={() => handleUnlock(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Tooltip title="解锁账号">
              <Button size="small" icon={<UnlockOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Search
          placeholder="搜索用户名或邮箱"
          allowClear
          onSearch={handleSearch}
          style={{ width: 200 }}
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="角色筛选"
          allowClear
          style={{ width: 120 }}
          onChange={(value) => setRoleFilter(value as UserRole)}
          options={[
            { value: 'admin', label: '管理员' },
            { value: 'user', label: '用户' },
            { value: 'viewer', label: '访客' },
          ]}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          onChange={(value) => setStatusFilter(value as UserStatus)}
          options={[
            { value: 'active', label: '正常' },
            { value: 'disabled', label: '已禁用' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
          刷新
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
      />

      {editingUser && (
        <UserRoleEditor
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUserUpdated}
        />
      )}
    </div>
  );
};

export default UserList;
