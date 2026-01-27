/**
 * 功能维度配置表单
 */
import React from 'react';
import { Form, InputNumber, Select, Slider, Row, Col, Typography } from 'antd';
import type { FunctionalDimensions, RecordingMode, VideoQuality } from '../../types';
import { validateNumericField } from '../../utils/validation';
import { FormLabel } from '../common/FormLabel';
import { RECORDING_MODE_OPTIONS, VIDEO_QUALITY_OPTIONS, FORM_TOOLTIPS } from '../../constants/forms';

const { Text } = Typography;

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

  return (
    <div className="dimension-form">
      <div className="dimension-form-header">
        <Text strong style={{ fontSize: 14 }}>功能维度配置</Text>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
          配置 IPC 设备的基本参数和录像策略
        </Text>
      </div>

      <Form layout="vertical">
        <Row gutter={24}>
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
            <Form.Item label={<FormLabel label="录像模式" tooltip={FORM_TOOLTIPS.recordingMode} />}>
              <Select
                value={value.recording_mode}
                onChange={(val: RecordingMode) => handleChange('recording_mode', val)}
                options={RECORDING_MODE_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label={<FormLabel label="视频质量" tooltip={FORM_TOOLTIPS.videoQuality} />}>
              <Select
                value={value.video_quality}
                onChange={(val: VideoQuality) => handleChange('video_quality', val)}
              >
                {VIDEO_QUALITY_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.dataRate})
                  </Select.Option>
                ))}
              </Select>
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

          {value.recording_mode === 'event_triggered' && (
            <>
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
            </>
          )}

          <Col span={24}>
            <Form.Item
              label={
                <FormLabel
                  label={`回看比例 (${Math.round(value.access_pattern * 100)}%)`}
                  tooltip={FORM_TOOLTIPS.accessPattern}
                />
              }
            >
              <Slider
                min={0}
                max={100}
                value={value.access_pattern * 100}
                onChange={(val) => handleChange('access_pattern', val / 100)}
                marks={{
                  0: '0%',
                  10: '10%',
                  25: '25%',
                  50: '50%',
                  100: '100%',
                }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default FunctionalForm;
