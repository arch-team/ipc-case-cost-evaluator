/**
 * 生命周期阶段编辑器
 * 支持自定义添加、编辑、删除存储阶段
 */
import React from 'react';
import {
  Card,
  Button,
  InputNumber,
  Select,
  Space,
  Typography,
  Alert,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { LifecycleStage, StorageClass } from '../../types';

const { Text } = Typography;

interface StageEditorProps {
  value: LifecycleStage[];
  onChange: (stages: LifecycleStage[]) => void;
  maxDays: number;
}

const storageClassOptions = [
  { value: 'STANDARD', label: 'S3 Standard', color: '#1890ff' },
  { value: 'GLACIER_IR', label: 'Glacier IR', color: '#722ed1' },
  { value: 'DEEP_ARCHIVE', label: 'Deep Archive', color: '#fa8c16' },
];

const StageEditor: React.FC<StageEditorProps> = ({ value, onChange, maxDays }) => {
  // 验证阶段配置
  const validateStages = (stages: LifecycleStage[]): string | null => {
    if (stages.length === 0) {
      return '至少需要一个存储阶段';
    }

    // 检查第一阶段是否从第1天开始
    if (stages[0].start_day !== 1) {
      return '第一个阶段必须从第 1 天开始';
    }

    // 检查连续性
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].start_day !== stages[i - 1].end_day + 1) {
        return `阶段 ${i} 和阶段 ${i + 1} 之间存在间隙或重叠`;
      }
    }

    // 检查最后一阶段是否到达保留天数
    const lastStage = stages[stages.length - 1];
    if (lastStage.end_day !== maxDays) {
      return `最后一个阶段需要结束于第 ${maxDays} 天（当前保留天数）`;
    }

    return null;
  };

  const validationError = validateStages(value);

  // 添加新阶段
  const handleAddStage = () => {
    const lastStage = value[value.length - 1];
    const newStartDay = lastStage ? lastStage.end_day + 1 : 1;

    if (newStartDay > maxDays) {
      return; // 已经覆盖所有天数
    }

    const newStage: LifecycleStage = {
      start_day: newStartDay,
      end_day: maxDays,
      storage_class: 'GLACIER_IR',
    };

    // 如果有上一阶段，调整其结束天数
    if (lastStage && lastStage.end_day === maxDays) {
      const midPoint = Math.floor((lastStage.start_day + maxDays) / 2);
      const updatedStages = [...value];
      updatedStages[updatedStages.length - 1] = {
        ...lastStage,
        end_day: midPoint,
      };
      newStage.start_day = midPoint + 1;
      onChange([...updatedStages, newStage]);
    } else {
      onChange([...value, newStage]);
    }
  };

  // 删除阶段
  const handleDeleteStage = (index: number) => {
    if (value.length <= 1) {
      return; // 至少保留一个阶段
    }

    const newStages = [...value];
    newStages.splice(index, 1);

    // 调整后续阶段的天数
    if (index === 0 && newStages.length > 0) {
      // 删除第一阶段，让第二阶段从第1天开始
      newStages[0] = { ...newStages[0], start_day: 1 };
    } else if (index > 0 && index < newStages.length) {
      // 删除中间阶段，连接前后
      newStages[index] = {
        ...newStages[index],
        start_day: newStages[index - 1].end_day + 1,
      };
    } else if (index === newStages.length) {
      // 删除最后一阶段，扩展倒数第二阶段
      newStages[newStages.length - 1] = {
        ...newStages[newStages.length - 1],
        end_day: maxDays,
      };
    }

    onChange(newStages);
  };

  // 更新阶段
  const handleUpdateStage = (
    index: number,
    field: keyof LifecycleStage,
    fieldValue: number | StorageClass
  ) => {
    const newStages = [...value];
    newStages[index] = { ...newStages[index], [field]: fieldValue };

    // 如果更新结束天数，自动调整下一阶段的开始天数
    if (field === 'end_day' && index < newStages.length - 1) {
      newStages[index + 1] = {
        ...newStages[index + 1],
        start_day: (fieldValue as number) + 1,
      };
    }

    // 如果更新开始天数，自动调整上一阶段的结束天数
    if (field === 'start_day' && index > 0) {
      newStages[index - 1] = {
        ...newStages[index - 1],
        end_day: (fieldValue as number) - 1,
      };
    }

    onChange(newStages);
  };

  return (
    <div>
      {validationError && (
        <Alert
          message={validationError}
          type="warning"
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        {value.map((stage, index) => (
          <Card key={index} size="small">
            <Space wrap>
              <Text strong>阶段 {index + 1}</Text>

              <Space size={4}>
                <Text type="secondary">第</Text>
                <InputNumber
                  min={index === 0 ? 1 : value[index - 1]?.end_day + 1 || 1}
                  max={stage.end_day}
                  value={stage.start_day}
                  onChange={(v) => handleUpdateStage(index, 'start_day', v || 1)}
                  disabled={index === 0}
                  size="small"
                  style={{ width: 70 }}
                />
                <Text type="secondary">天 至 第</Text>
                <InputNumber
                  min={stage.start_day}
                  max={index === value.length - 1 ? maxDays : value[index + 1]?.start_day - 1 || maxDays}
                  value={stage.end_day}
                  onChange={(v) => handleUpdateStage(index, 'end_day', v || stage.start_day)}
                  size="small"
                  style={{ width: 70 }}
                />
                <Text type="secondary">天</Text>
              </Space>

              <Select
                value={stage.storage_class}
                onChange={(v) => handleUpdateStage(index, 'storage_class', v)}
                size="small"
                style={{ width: 140 }}
                options={storageClassOptions.map(opt => ({
                  value: opt.value,
                  label: (
                    <Space>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: opt.color,
                        }}
                      />
                      {opt.label}
                    </Space>
                  ),
                }))}
              />

              <Tooltip title={value.length <= 1 ? '至少保留一个阶段' : '删除此阶段'}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteStage(index)}
                  disabled={value.length <= 1}
                  size="small"
                />
              </Tooltip>
            </Space>
          </Card>
        ))}

        <Button
          type="dashed"
          onClick={handleAddStage}
          icon={<PlusOutlined />}
          style={{ width: '100%' }}
          disabled={value.length > 0 && value[value.length - 1]?.end_day >= maxDays}
        >
          添加阶段
        </Button>
      </Space>

      <div style={{ marginTop: 16 }}>
        <Text type="secondary">
          提示：阶段天数需要连续，总天数需等于保留天数（{maxDays}天）
        </Text>
      </div>
    </div>
  );
};

export default StageEditor;
