/**
 * 输入参数对比组件
 */
import React from 'react';
import { Row, Col, Table, Typography, Tag } from 'antd';
import type { CalculationRecord } from '../../types/calculationRecords';
import { RECORD_COLORS, areValuesEqual } from '../../utils/comparisonHelpers';

const { Title, Text } = Typography;

interface Props {
  records: CalculationRecord[];
}

// 录像模式显示名称
const RECORDING_MODE_NAMES: Record<string, string> = {
  event_triggered: '事件触发',
  continuous: '7x24 连续',
  scheduled: '定时录像',
};

// 视频质量显示名称
const VIDEO_QUALITY_NAMES: Record<string, string> = {
  '2k': '2K (2560x1440)',
  '1080p': '1080P (1920x1080)',
  '720p': '720P (1280x720)',
  '480p': '480P (854x480)',
};

// 分片策略显示名称
const SEGMENT_STRATEGY_NAMES: Record<string, string> = {
  time_based: '按时间分片',
  size_based: '按大小分片',
};

interface ParamRow {
  key: string;
  label: string;
  getValue: (r: CalculationRecord) => string;
}

const InputParamsComparison: React.FC<Props> = ({ records }) => {
  // 功能维度参数
  const functionalParams: ParamRow[] = [
    {
      key: 'device_count',
      label: '设备数量',
      getValue: (r) => `${r.input_params.functional.device_count} 台`,
    },
    {
      key: 'recording_mode',
      label: '录像模式',
      getValue: (r) =>
        RECORDING_MODE_NAMES[r.input_params.functional.recording_mode] ||
        r.input_params.functional.recording_mode,
    },
    {
      key: 'video_quality',
      label: '视频质量',
      getValue: (r) =>
        VIDEO_QUALITY_NAMES[r.input_params.functional.video_quality] ||
        r.input_params.functional.video_quality,
    },
    {
      key: 'retention_days',
      label: '保留天数',
      getValue: (r) => `${r.input_params.functional.retention_days} 天`,
    },
    {
      key: 'events_per_day',
      label: '每日事件数',
      getValue: (r) =>
        r.input_params.functional.events_per_day
          ? `${r.input_params.functional.events_per_day} 次`
          : '-',
    },
    {
      key: 'event_duration',
      label: '事件时长',
      getValue: (r) =>
        r.input_params.functional.event_duration_seconds
          ? `${r.input_params.functional.event_duration_seconds} 秒`
          : '-',
    },
    {
      key: 'access_pattern',
      label: '回看比例',
      getValue: (r) =>
        `${(r.input_params.functional.access_pattern * 100).toFixed(1)}%`,
    },
  ];

  // 技术维度参数
  const technicalParams: ParamRow[] = [
    {
      key: 'storage_class',
      label: '存储类型',
      getValue: (r) => r.input_params.technical.storage_class,
    },
    {
      key: 'segment_strategy',
      label: '分片策略',
      getValue: (r) =>
        SEGMENT_STRATEGY_NAMES[r.input_params.technical.segment_strategy] ||
        r.input_params.technical.segment_strategy,
    },
    {
      key: 'segment_seconds',
      label: '分片时长',
      getValue: (r) =>
        r.input_params.technical.segment_seconds
          ? `${r.input_params.technical.segment_seconds} 秒`
          : '-',
    },
    {
      key: 'lifecycle_enabled',
      label: '生命周期',
      getValue: (r) =>
        r.input_params.technical.lifecycle_enabled ? '已启用' : '未启用',
    },
  ];

  // 构建表格列
  const buildColumns = () => [
    {
      title: '参数',
      dataIndex: 'label',
      key: 'label',
      width: 120,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...records.map((record, idx) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: RECORD_COLORS[idx],
              marginRight: 8,
            }}
          />
          {record.name}
        </div>
      ),
      dataIndex: `value_${idx}`,
      key: `value_${idx}`,
      align: 'center' as const,
      render: (value: string, row: { key: string; values: string[] }) => {
        const isDifferent = !areValuesEqual(row.values);

        if (row.key === 'lifecycle_enabled') {
          const enabled = value === '已启用';
          return (
            <Tag color={enabled ? 'green' : 'default'}>{value}</Tag>
          );
        }

        return (
          <Text
            style={{
              backgroundColor: isDifferent ? '#fff7e6' : undefined,
              padding: isDifferent ? '2px 8px' : undefined,
              borderRadius: isDifferent ? 4 : undefined,
            }}
          >
            {value}
          </Text>
        );
      },
    })),
  ];

  // 构建表格数据
  const buildDataSource = (params: ParamRow[]) =>
    params.map((param) => {
      const values = records.map((r) => param.getValue(r));
      return {
        key: param.key,
        label: param.label,
        values,
        ...records.reduce(
          (acc, record, idx) => ({
            ...acc,
            [`value_${idx}`]: param.getValue(record),
          }),
          {}
        ),
      };
    });

  return (
    <Row gutter={24}>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>功能维度</Title>
        <Table
          dataSource={buildDataSource(functionalParams)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
      <Col span={12}>
        <Title level={5} style={{ marginBottom: 12 }}>技术维度</Title>
        <Table
          dataSource={buildDataSource(technicalParams)}
          columns={buildColumns()}
          pagination={false}
          size="small"
          bordered
        />
      </Col>
    </Row>
  );
};

export default InputParamsComparison;
