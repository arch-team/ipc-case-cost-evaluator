/**
 * 设置页面
 */
import React from 'react';
import { Card, Typography, Descriptions, Tag } from 'antd';

const { Title } = Typography;

const Settings: React.FC = () => {
  return (
    <div>
      <Card>
        <Title level={4}>系统设置</Title>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="API 地址">
            {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}
          </Descriptions.Item>
          <Descriptions.Item label="版本">
            <Tag color="blue">v1.0.0</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="环境">
            <Tag color={import.meta.env.DEV ? 'orange' : 'green'}>
              {import.meta.env.DEV ? '开发环境' : '生产环境'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default Settings;
