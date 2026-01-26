/**
 * 预设场景选择器
 * 优化版本：每行 2 个卡片，分类区块边框，简洁信息展示
 */
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Spin, message, Empty } from 'antd';
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
import type { Scenario, CostCalculationInput, ScenarioCategory, RecordingMode, VideoQuality, StorageClass } from '../../types';

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

// 存储类型显示名称
const storageClassLabels: Record<string, string> = {
  STANDARD: 'Standard',
  GLACIER_IR: 'Glacier IR',
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
        recording_mode: scenario.functional.recording_mode as RecordingMode,
        video_quality: scenario.functional.video_quality as VideoQuality,
        events_per_day: scenario.functional.events_per_day || 0,
        event_duration_sec: scenario.functional.event_duration_sec || 0,
        retention_days: scenario.functional.retention_days,
        access_pattern: scenario.functional.access_pattern,
      },
      technical: {
        storage_class: scenario.technical.storage_class as StorageClass,
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
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8 }}>选择预设场景</Title>
        <Text type="secondary">
          选择一个预设场景快速开始，或自定义配置
        </Text>
      </div>

      {groupedScenarios.length === 0 ? (
        <Empty description="暂无预设场景" />
      ) : (
        groupedScenarios.map((group) =>
          group.scenarios.length > 0 ? (
            <div key={group.id} className="scenario-category-group">
              {/* 分类标题 */}
              <div className="scenario-category-title">
                {categoryIcons[group.id] || <SettingOutlined />}
                <span>{group.name}</span>
              </div>

              {/* 场景卡片网格 - 每行 2 个 */}
              <Row gutter={[24, 24]}>
                {group.scenarios.map((scenario) => (
                  <Col xs={24} sm={24} md={12} lg={12} key={scenario.id}>
                    <Card
                      hoverable
                      onClick={() => handleSelect(scenario)}
                      className="scenario-card"
                      data-testid={`scenario-card-${scenario.id}`}
                    >
                      {/* 场景名称 */}
                      <div className="scenario-card-title">
                        {scenario.name}
                      </div>

                      {/* 简洁信息展示 - 两行 */}
                      <div className="scenario-card-info">
                        {/* 第一行：设备数 · 保留天数 */}
                        <div className="scenario-card-info-row">
                          <span>{scenario.functional.device_count} 台</span>
                          <span className="scenario-card-info-separator">·</span>
                          <span>{scenario.functional.retention_days} 天</span>
                        </div>

                        {/* 第二行：录像模式 · 存储类型 */}
                        <div className="scenario-card-info-row">
                          <span>
                            {recordingModeLabels[scenario.functional.recording_mode] ||
                              scenario.functional.recording_mode}
                          </span>
                          <span className="scenario-card-info-separator">·</span>
                          <span>
                            {storageClassLabels[scenario.technical.storage_class] ||
                              scenario.technical.storage_class}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ) : null
        )
      )}

      {/* 自定义配置选项 */}
      <Card
        hoverable
        onClick={onCustom}
        className="scenario-custom-card"
        data-testid="scenario-custom-card"
      >
        <SettingOutlined />
        <Title level={5} style={{ marginBottom: 8 }}>
          自定义配置
        </Title>
        <Text type="secondary">从头开始配置所有参数</Text>
      </Card>
    </div>
  );
};

export default ScenarioSelector;
