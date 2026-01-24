/**
 * 功能维度配置表单
 */
import React from 'react';
import { Form, InputNumber, Select, Slider, Row, Col, Typography, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { FunctionalDimensions, RecordingMode, VideoQuality } from '../../types';

const { Title, Text } = Typography;

interface FunctionalFormProps {
  value: FunctionalDimensions;
  onChange: (value: FunctionalDimensions) => void;
}

const recordingModeOptions = [
  { value: 'continuous', label: '全天候录像' },
  { value: 'event_triggered', label: '事件触发' },
  { value: 'scheduled', label: '定时录像' },
];

const videoQualityOptions = [
  { value: '720p', label: '720P (高清)', dataRate: '125 KB/s' },
  { value: '1080p', label: '1080P (全高清)', dataRate: '312.5 KB/s' },
  { value: '2k', label: '2K (超清)', dataRate: '625 KB/s' },
  { value: '4k', label: '4K (超高清)', dataRate: '1500 KB/s' },
];

const FunctionalForm: React.FC<FunctionalFormProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof FunctionalDimensions, val: any) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <div>
      <Title level={4}>功能维度配置</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        配置 IPC 设备的基本参数和录像策略
      </Text>

      <Form layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              label={
                <span>
                  设备数量{' '}
                  <Tooltip title="需要评估的 IPC 设备总数">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                min={1}
                max={100000}
                value={value.device_count}
                onChange={(val) => handleChange('device_count', val || 1)}
                style={{ width: '100%' }}
                addonAfter="台"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label={
                <span>
                  录像模式{' '}
                  <Tooltip title="全天候：24小时不间断录像；事件触发：仅在检测到事件时录像；定时录像：按预设时间段录像">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Select
                value={value.recording_mode}
                onChange={(val: RecordingMode) => handleChange('recording_mode', val)}
                options={recordingModeOptions}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label={
                <span>
                  视频质量{' '}
                  <Tooltip title="视频分辨率，质量越高数据量越大">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Select
                value={value.video_quality}
                onChange={(val: VideoQuality) => handleChange('video_quality', val)}
              >
                {videoQualityOptions.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.dataRate})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label={
                <span>
                  保留天数{' '}
                  <Tooltip title="视频数据在云端保留的天数">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                min={1}
                max={365}
                value={value.retention_days}
                onChange={(val) => handleChange('retention_days', val || 30)}
                style={{ width: '100%' }}
                addonAfter="天"
              />
            </Form.Item>
          </Col>

          {value.recording_mode === 'event_triggered' && (
            <>
              <Col span={12}>
                <Form.Item
                  label={
                    <span>
                      每日事件数{' '}
                      <Tooltip title="每台设备每天触发的事件次数">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </span>
                  }
                >
                  <InputNumber
                    min={1}
                    max={10000}
                    value={value.events_per_day}
                    onChange={(val) => handleChange('events_per_day', val || 400)}
                    style={{ width: '100%' }}
                    addonAfter="次"
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={
                    <span>
                      事件时长{' '}
                      <Tooltip title="每次事件录像的持续时间">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </span>
                  }
                >
                  <InputNumber
                    min={1}
                    max={300}
                    value={value.event_duration_sec}
                    onChange={(val) => handleChange('event_duration_sec', val || 15)}
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
                <span>
                  回看比例 ({Math.round(value.access_pattern * 100)}%){' '}
                  <Tooltip title="用户回看视频的比例，影响 GET 请求数量和数据传输费用">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
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
