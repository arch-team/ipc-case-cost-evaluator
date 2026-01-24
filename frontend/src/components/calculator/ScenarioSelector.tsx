/**
 * 预设场景选择器
 */
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Tag, Spin, message, Empty } from 'antd';
import {
  ShopOutlined,
  BankOutlined,
  HomeOutlined,
  CarOutlined,
  SafetyOutlined,
  InboxOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { scenarioApi } from '../../api/client';
import type { Scenario, CostCalculationInput, ScenarioCategory } from '../../types';

const { Title, Text } = Typography;

interface Props {
  onSelect: (input: CostCalculationInput) => void;
  onCustom: () => void;
}

// 分类图标映射
const categoryIcons: Record<string, React.ReactNode> = {
  retail: <ShopOutlined />,
  enterprise: <BankOutlined />,
  residential: <HomeOutlined />,
  traffic: <CarOutlined />,
  finance: <SafetyOutlined />,
  logistics: <InboxOutlined />,
};

// 存储类型标签颜色
const storageColors: Record<string, string> = {
  STANDARD: 'blue',
  GLACIER_IR: 'orange',
};

// 录像模式标签
const recordingModeLabels: Record<string, string> = {
  continuous: '全天候',
  event_triggered: '事件触发',
  scheduled: '定时段',
};

const ScenarioSelector: React.FC<Props> = ({ onSelect, onCustom }) => {
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [categories, setCategories] = useState<ScenarioCategory[]>([]);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await scenarioApi.list();
      setScenarios(data.scenarios || []);
      setCategories(data.categories || []);
    } catch (error) {
      message.error('加载预设场景失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (scenario: Scenario) => {
    // 转换场景数据为 CostCalculationInput 格式
    const input: CostCalculationInput = {
      functional: {
        device_count: scenario.functional.device_count,
        recording_mode: scenario.functional.recording_mode as any,
        video_quality: scenario.functional.video_quality as any,
        events_per_day: scenario.functional.events_per_day || 0,
        event_duration_sec: scenario.functional.event_duration_sec || 0,
        retention_days: scenario.functional.retention_days,
        access_pattern: scenario.functional.access_pattern,
      },
      technical: {
        storage_class: scenario.technical.storage_class as any,
      },
      pricing: {
        region: scenario.pricing.region,
        discount_percent: scenario.pricing.discount_percent,
      },
    };
    onSelect(input);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">正在加载预设场景...</Text>
        </div>
      </div>
    );
  }

  // 按分类分组场景
  const groupedScenarios = categories.map((cat) => ({
    ...cat,
    scenarios: scenarios.filter((s) => s.category === cat.id),
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>选择预设场景快速开始</Title>
        <Text type="secondary">
          选择一个预设场景自动填充参数，或点击"自定义配置"从头开始
        </Text>
      </div>

      {groupedScenarios.length === 0 ? (
        <Empty description="暂无预设场景" />
      ) : (
        groupedScenarios.map((group) =>
          group.scenarios.length > 0 ? (
            <div key={group.id} style={{ marginBottom: 32 }}>
              <Title level={5} style={{ marginBottom: 16 }}>
                <span style={{ marginRight: 8 }}>
                  {categoryIcons[group.id] || <SettingOutlined />}
                </span>
                {group.name}
              </Title>
              <Row gutter={[16, 16]}>
                {group.scenarios.map((scenario) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={scenario.id}>
                    <Card
                      hoverable
                      onClick={() => handleSelect(scenario)}
                      style={{ height: '100%' }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <Title level={5} style={{ marginBottom: 8, fontSize: 14 }}>
                        {scenario.name}
                      </Title>
                      <Text
                        type="secondary"
                        style={{
                          display: 'block',
                          marginBottom: 12,
                          fontSize: 12,
                          minHeight: 36,
                        }}
                      >
                        {scenario.description}
                      </Text>
                      <div>
                        <Tag>{scenario.functional.device_count} 台</Tag>
                        <Tag color={storageColors[scenario.technical.storage_class] || 'default'}>
                          {scenario.technical.storage_class}
                        </Tag>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Tag color="green">
                          {recordingModeLabels[scenario.functional.recording_mode] ||
                            scenario.functional.recording_mode}
                        </Tag>
                        <Tag>{scenario.functional.retention_days} 天</Tag>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ) : null
        )
      )}

      {/* 自定义选项 */}
      <Card
        hoverable
        onClick={onCustom}
        style={{ marginTop: 16, borderStyle: 'dashed' }}
        bodyStyle={{ padding: 24 }}
      >
        <div style={{ textAlign: 'center' }}>
          <SettingOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 12 }} />
          <Title level={5} style={{ marginBottom: 8 }}>
            自定义配置
          </Title>
          <Text type="secondary">从头开始配置所有参数</Text>
        </div>
      </Card>
    </div>
  );
};

export default ScenarioSelector;
