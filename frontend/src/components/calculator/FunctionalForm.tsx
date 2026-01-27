/**
 * 功能维度配置表单
 * 优化布局：三列紧凑设计，按业务逻辑分组
 */
import React from 'react';
import { Form, InputNumber, Select, Row, Col, Divider } from 'antd';
import { SettingOutlined, VideoCameraOutlined, EyeOutlined } from '@ant-design/icons';
import type { FunctionalDimensions, RecordingMode, VideoQuality, AccessPatternConfig } from '../../types';
import { validateNumericField } from '../../utils/validation';
import { FormLabel } from '../common/FormLabel';
import { RECORDING_MODE_OPTIONS, VIDEO_QUALITY_OPTIONS, FORM_TOOLTIPS } from '../../constants/forms';
import AccessPatternSelector from './AccessPatternSelector';

interface FunctionalFormProps {
  value: FunctionalDimensions;
  onChange: (value: FunctionalDimensions) => void;
}

const FunctionalForm: React.FC<FunctionalFormProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof FunctionalDimensions, val: string | number | boolean | null | undefined) => {
    // 对于数值字段，使用验证函数
    if (typeof val === 'number' || val === null || val === undefined || val === '') {
      const validatedValue = validateNumericField(field, val);
      onChange({ ...value, [field]: validatedValue });
    } else {
      // 非数值字段直接更新
      onChange({ ...value, [field]: val });
    }
  };

  // 处理访问模式变化
  const handleAccessPatternChange = (accessPattern: number, config?: AccessPatternConfig) => {
    onChange({
      ...value,
      access_pattern: accessPattern,
      access_pattern_config: config,
    });
  };

  const isEventTriggered = value.recording_mode === 'event_triggered';

  return (
    <div className="dimension-form">
      <Form layout="vertical">
        {/* 分组 1: 基础配置 - 两列布局 */}
        <div className="form-group">
          <div className="form-group-title">
            <SettingOutlined className="form-group-icon" />
            <span>基础配置</span>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<FormLabel label="设备数量" tooltip={FORM_TOOLTIPS.deviceCount} />}>
                <InputNumber
                  min={1}
                  max={100000}
                  value={value.device_count}
                  onChange={(val) => handleChange('device_count', val)}
                  style={{ width: '100%' }}
                  addonAfter="台"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<FormLabel label="保留天数" tooltip={FORM_TOOLTIPS.retentionDays} />}>
                <InputNumber
                  min={1}
                  max={365}
                  value={value.retention_days}
                  onChange={(val) => handleChange('retention_days', val)}
                  style={{ width: '100%' }}
                  addonAfter="天"
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <Divider className="form-group-divider" />

        {/* 分组 2: 录像策略 */}
        <div className="form-group">
          <div className="form-group-title">
            <VideoCameraOutlined className="form-group-icon" />
            <span>录像策略</span>
          </div>

          {/* 视频质量 + 录像模式 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<FormLabel label="视频质量" tooltip={FORM_TOOLTIPS.videoQuality} />}>
                <Select
                  value={value.video_quality}
                  onChange={(val: VideoQuality) => handleChange('video_quality', val)}
                >
                  {VIDEO_QUALITY_OPTIONS.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<FormLabel label="录像模式" tooltip={FORM_TOOLTIPS.recordingMode} />}>
                <Select
                  value={value.recording_mode}
                  onChange={(val: RecordingMode) => handleChange('recording_mode', val)}
                  options={RECORDING_MODE_OPTIONS}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 事件参数 - 条件显示区域 */}
          {isEventTriggered && (
            <div className="form-conditional-section">
              <div className="form-conditional-hint">事件触发参数</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={<FormLabel label="每日事件数" tooltip={FORM_TOOLTIPS.eventsPerDay} />}>
                    <InputNumber
                      min={1}
                      max={10000}
                      value={value.events_per_day}
                      onChange={(val) => handleChange('events_per_day', val)}
                      style={{ width: '100%' }}
                      addonAfter="次"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<FormLabel label="事件时长" tooltip={FORM_TOOLTIPS.eventDuration} />}>
                    <InputNumber
                      min={1}
                      max={300}
                      value={value.event_duration_sec}
                      onChange={(val) => handleChange('event_duration_sec', val)}
                      style={{ width: '100%' }}
                      addonAfter="秒"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}
        </div>

        <Divider className="form-group-divider" />

        {/* 分组 3: 访问模式 */}
        <div className="form-group">
          <div className="form-group-title">
            <EyeOutlined className="form-group-icon" />
            <span>访问模式</span>
          </div>
          <AccessPatternSelector
            accessPattern={value.access_pattern}
            accessPatternConfig={value.access_pattern_config}
            retentionDays={value.retention_days}
            onChange={handleAccessPatternChange}
          />
        </div>
      </Form>
    </div>
  );
};

export default FunctionalForm;
