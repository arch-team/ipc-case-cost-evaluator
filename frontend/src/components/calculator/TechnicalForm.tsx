/**
 * 技术维度配置表单
 * 优化版本：紧凑布局，适合窄面板
 */
import React from 'react';
import { Radio, Typography, Space, Tag, Divider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { TechnicalDimensions, StorageClass, LifecyclePolicy } from '../../types';
import StorageStrategySelector from './StorageStrategySelector';

const { Text } = Typography;

interface TechnicalFormProps {
  value: TechnicalDimensions;
  onChange: (value: TechnicalDimensions) => void;
  retentionDays: number;
}

const storageClassOptions = [
  {
    value: 'STANDARD',
    label: 'S3 Standard',
    price: '$0.025/GB',
    hint: '频繁访问',
    color: 'blue',
  },
  {
    value: 'GLACIER_IR',
    label: 'Glacier IR',
    price: '$0.004/GB',
    hint: '低频访问',
    color: 'purple',
  },
];

const TechnicalForm: React.FC<TechnicalFormProps> = ({ value, onChange, retentionDays }) => {
  const hasLifecyclePolicy = value.lifecycle_policy?.enabled;

  const handleStorageClassChange = (storageClass: StorageClass) => {
    onChange({
      ...value,
      storage_class: storageClass,
      lifecycle_policy: undefined,
    });
  };

  const handleLifecyclePolicyChange = (policy: LifecyclePolicy | undefined) => {
    if (policy?.enabled) {
      onChange({
        ...value,
        storage_class: 'STANDARD',
        lifecycle_policy: policy,
      });
    } else {
      onChange({
        ...value,
        lifecycle_policy: undefined,
      });
    }
  };

  return (
    <div className="technical-form-compact">
      {/* 生命周期策略选择器 */}
      <StorageStrategySelector
        value={value.lifecycle_policy}
        onChange={handleLifecyclePolicyChange}
        retentionDays={retentionDays}
      />

      {/* 单一存储类型选择（仅在未启用生命周期策略时显示） */}
      {!hasLifecyclePolicy && (
        <>
          <Divider style={{ margin: '12px 0', fontSize: 12 }}>存储类型</Divider>
          <Radio.Group
            value={value.storage_class}
            onChange={(e) => handleStorageClassChange(e.target.value)}
            className="storage-class-group-compact"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {storageClassOptions.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  className="storage-class-radio-compact"
                >
                  <div className="storage-class-option">
                    <div className="storage-class-main">
                      <Tag color={option.color} style={{ margin: 0 }}>
                        {option.label}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        {option.price}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {option.hint}
                    </Text>
                  </div>
                </Radio>
              ))}
            </Space>
          </Radio.Group>

          {/* 简短提示 */}
          <div className="storage-hint-compact">
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              回看率 &gt;10% 推荐 Standard，&lt;10% 推荐 Glacier IR
            </Text>
          </div>
        </>
      )}
    </div>
  );
};

export default TechnicalForm;
