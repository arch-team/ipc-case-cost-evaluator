/**
 * 区域选择器组件
 *
 * 用于在定价管理页面选择 AWS 区域
 */
import React from 'react';
import { Select, Tag, Space, Typography } from 'antd';
import { GlobalOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { RegionInfo, CacheStatusItem } from '../../types';

const { Text } = Typography;

interface RegionSelectorProps {
  regions: RegionInfo[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  cacheStatus?: { [region: string]: CacheStatusItem };
  loading?: boolean;
}

const RegionSelector: React.FC<RegionSelectorProps> = ({
  regions,
  selectedRegion,
  onRegionChange,
  cacheStatus,
  loading = false,
}) => {
  // 渲染区域选项，包含缓存状态
  const renderOption = (region: RegionInfo) => {
    const cache = cacheStatus?.[region.region];
    const isCached = cache?.cached;
    const isFallback = cache?.is_fallback;

    return (
      <Space>
        <GlobalOutlined />
        <span>{region.name}</span>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ({region.region})
        </Text>
        {isCached && (
          <Tag
            color={isFallback ? 'orange' : 'green'}
            style={{ marginLeft: 8, fontSize: 10 }}
          >
            {isFallback ? '本地缓存' : '已缓存'}
          </Tag>
        )}
      </Space>
    );
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>选择 AWS 区域</Text>
        <Select
          value={selectedRegion}
          onChange={onRegionChange}
          style={{ width: 400 }}
          loading={loading}
          showSearch
          filterOption={(input, option) => {
            const region = regions.find(r => r.region === option?.value);
            if (!region) return false;
            return (
              region.name.toLowerCase().includes(input.toLowerCase()) ||
              region.region.toLowerCase().includes(input.toLowerCase())
            );
          }}
          placeholder="请选择区域"
          optionLabelProp="label"
        >
          {regions.map((region) => (
              <Select.Option
                key={region.region}
                value={region.region}
                label={`${region.name} (${region.region})`}
              >
                {renderOption(region)}
              </Select.Option>
          ))}
        </Select>
        {cacheStatus?.[selectedRegion] && (
          <Space style={{ marginTop: 4 }}>
            {cacheStatus[selectedRegion].is_fallback ? (
              <Tag icon={<ExclamationCircleOutlined />} color="warning">
                使用本地缓存数据
              </Tag>
            ) : (
              <Tag icon={<CheckCircleOutlined />} color="success">
                数据来源: {cacheStatus[selectedRegion].source}
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              更新于: {new Date(cacheStatus[selectedRegion].updated_at).toLocaleString()}
            </Text>
          </Space>
        )}
      </Space>
    </div>
  );
};

export default RegionSelector;
