/**
 * 输入参数展示组件
 *
 * 展示三维度输入参数快照，使用 Ant Design Descriptions 组件。
 * - 功能维度：设备数量、录像模式、视频质量、保留天数、事件配置、回看比例
 * - 技术维度：存储类型、分片策略、生命周期配置
 * - 价格维度：AWS 区域、折扣百分比
 */
import React from 'react';
import { Descriptions, Tag, Typography, Row, Col, Card } from 'antd';
import {
  CloudOutlined,
  SettingOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { InputParameterSnapshot } from '../../types/calculationRecords';
import {
  getRecordingModeLabel,
  getVideoQualityLabel,
  getStorageClassLabel,
  getStorageClassColor,
  getSegmentStrategyLabel,
  storageClassLabels,
} from '../../utils/enumLabels';

const { Text } = Typography;

interface InputParamsDisplayProps {
  params: InputParameterSnapshot;
}

const InputParamsDisplay: React.FC<InputParamsDisplayProps> = ({ params }) => {
  const { functional, technical, pricing } = params;

  return (
    <Row gutter={[16, 16]}>
      {/* 功能维度 */}
      <Col xs={24} lg={8}>
        <Card
          size="small"
          title={
            <span>
              <CloudOutlined style={{ marginRight: 8 }} />
              功能配置
            </span>
          }
          bordered={false}
          style={{ height: '100%' }}
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item label="设备数量">
              <Text strong>{functional.device_count}</Text> 台
            </Descriptions.Item>
            <Descriptions.Item label="录像模式">
              {getRecordingModeLabel(functional.recording_mode)}
            </Descriptions.Item>
            <Descriptions.Item label="视频质量">
              {getVideoQualityLabel(functional.video_quality)}
            </Descriptions.Item>
            <Descriptions.Item label="保留天数">
              <Text strong>{functional.retention_days}</Text> 天
            </Descriptions.Item>
            <Descriptions.Item label="回看比例">
              {(functional.access_pattern * 100).toFixed(0)}%
            </Descriptions.Item>
            {functional.recording_mode === 'event_triggered' && (
              <>
                <Descriptions.Item label="每日事件数">
                  {functional.events_per_day} 次
                </Descriptions.Item>
                <Descriptions.Item label="事件时长">
                  {functional.event_duration_seconds} 秒
                </Descriptions.Item>
              </>
            )}
            {functional.recording_mode === 'scheduled' && functional.scheduled_hours && (
              <Descriptions.Item label="每日录像时长">
                {functional.scheduled_hours} 小时
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </Col>

      {/* 技术维度 */}
      <Col xs={24} lg={8}>
        <Card
          size="small"
          title={
            <span>
              <SettingOutlined style={{ marginRight: 8 }} />
              技术配置
            </span>
          }
          bordered={false}
          style={{ height: '100%' }}
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item label="存储类型">
              <Tag color={getStorageClassColor(technical.storage_class)}>
                {getStorageClassLabel(technical.storage_class)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="分片策略">
              {getSegmentStrategyLabel(technical.segment_strategy)}
            </Descriptions.Item>
            {technical.segment_seconds && (
              <Descriptions.Item label="分片时长">
                {technical.segment_seconds} 秒
              </Descriptions.Item>
            )}
            {technical.segment_size_kb && (
              <Descriptions.Item label="分片大小">
                {technical.segment_size_kb} KB
              </Descriptions.Item>
            )}
            <Descriptions.Item label="生命周期策略">
              <Tag color={technical.lifecycle_enabled ? 'green' : 'default'}>
                {technical.lifecycle_enabled ? '已启用' : '未启用'}
              </Tag>
            </Descriptions.Item>
            {technical.lifecycle_enabled && technical.lifecycle_stages && (
              <Descriptions.Item label="生命周期阶段">
                <div style={{ fontSize: 12 }}>
                  {technical.lifecycle_stages.map((stage, index) => {
                    const stageStorageInfo = storageClassLabels[stage.storage_class] || {
                      label: stage.storage_class,
                      color: 'default',
                    };
                    return (
                      <div key={index} style={{ marginBottom: 4 }}>
                        第 {stage.start_day}-{stage.end_day} 天:
                        <Tag color={stageStorageInfo.color} style={{ marginLeft: 4, fontSize: 12 }}>
                          {stageStorageInfo.label}
                        </Tag>
                      </div>
                    );
                  })}
                </div>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </Col>

      {/* 价格维度 */}
      <Col xs={24} lg={8}>
        <Card
          size="small"
          title={
            <span>
              <DollarOutlined style={{ marginRight: 8 }} />
              定价配置
            </span>
          }
          bordered={false}
          style={{ height: '100%' }}
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item label="AWS 区域">
              {pricing.region_name}
            </Descriptions.Item>
            <Descriptions.Item label="区域代码">
              <Text code>{pricing.region}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="折扣比例">
              {pricing.discount_percent > 0 ? (
                <Tag color="green">{pricing.discount_percent}%</Tag>
              ) : (
                <Text type="secondary">无折扣</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
    </Row>
  );
};

export default InputParamsDisplay;
