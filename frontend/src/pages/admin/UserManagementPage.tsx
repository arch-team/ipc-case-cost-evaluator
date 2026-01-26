/**
 * 用户管理页面
 */
import React from 'react';
import { Card, Typography, Divider } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { UserList, SystemStats } from '../../components/admin';

const { Title } = Typography;

const UserManagementPage: React.FC = () => {
  return (
    <div>
      {/* 系统统计 */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>
          <TeamOutlined style={{ marginRight: 8 }} />
          系统概览
        </Title>
        <SystemStats />
      </Card>

      {/* 用户列表 */}
      <Card>
        <Title level={4}>用户管理</Title>
        <Divider />
        <UserList />
      </Card>
    </div>
  );
};

export default UserManagementPage;
