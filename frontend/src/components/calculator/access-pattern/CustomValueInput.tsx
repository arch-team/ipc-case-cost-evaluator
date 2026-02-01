/**
 * 自定义值输入组件 - 用于配置自定义时间衰减阶段
 */
import React from 'react';
import { InputNumber, Button } from 'antd';
import { CheckOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { AccessPatternStage } from '../../../types';
import type { CustomValueInputProps } from './types';
import { calculateWeightedAverage } from './utils';

const CustomValueInput: React.FC<CustomValueInputProps> = ({
  customStages,
  retentionDays,
  isSelected,
  onSelect,
  onChange,
}) => {
  // 更新自定义阶段
  const updateStage = (index: number, field: keyof AccessPatternStage, value: number) => {
    const newStages = [...customStages];
    newStages[index] = { ...newStages[index], [field]: value };

    // 自动调整相邻阶段的边界
    if (field === 'end_day' && index < newStages.length - 1) {
      newStages[index + 1] = { ...newStages[index + 1], start_day: value + 1 };
    }
    if (field === 'start_day' && index > 0) {
      newStages[index - 1] = { ...newStages[index - 1], end_day: value - 1 };
    }

    onChange(newStages);
  };

  // 添加新阶段
  const addStage = () => {
    const lastStage = customStages[customStages.length - 1];
    const newStartDay = lastStage ? lastStage.end_day + 1 : 1;
    const newEndDay = Math.min(newStartDay + 30, retentionDays);

    if (newStartDay > retentionDays) return;

    const newStages = [
      ...customStages,
      { start_day: newStartDay, end_day: newEndDay, access_rate: 0.05 },
    ];
    onChange(newStages);
  };

  // 删除阶段
  const removeStage = (index: number) => {
    if (customStages.length <= 1) return;

    const newStages = customStages.filter((_, i) => i !== index);
    // 重新调整边界
    for (let i = 1; i < newStages.length; i++) {
      newStages[i] = { ...newStages[i], start_day: newStages[i - 1].end_day + 1 };
    }

    onChange(newStages);
  };

  const weightedAvg = calculateWeightedAverage(customStages, retentionDays);

  return (
    <div className="access-custom-section">
      {/* 自定义卡片头部 */}
      <div
        className={`access-custom-header ${isSelected ? 'access-custom-header-selected' : ''}`}
        onClick={onSelect}
      >
        {isSelected && (
          <div className="access-preset-check">
            <CheckOutlined />
          </div>
        )}
        <div className="access-custom-title">
          <EditOutlined style={{ marginRight: 6 }} />
          自定义配置
        </div>
        <div className="access-preset-rate">~{(weightedAvg * 100).toFixed(0)}%</div>
      </div>

      {/* 自定义配置编辑区域 - 仅在选中时展开 */}
      {isSelected && (
        <div className="access-custom-editor">
          <div className="access-custom-stages">
            {customStages.map((stage, index) => (
              <div key={index} className="access-custom-stage-row">
                <div className="access-custom-stage-inputs">
                  <span className="access-custom-stage-label">第</span>
                  <InputNumber
                    size="small"
                    min={index === 0 ? 1 : customStages[index - 1].end_day + 1}
                    max={stage.end_day}
                    value={stage.start_day}
                    onChange={(v) => v && updateStage(index, 'start_day', v)}
                    style={{ width: 60 }}
                    disabled={index === 0}
                  />
                  <span className="access-custom-stage-label">-</span>
                  <InputNumber
                    size="small"
                    min={stage.start_day}
                    max={retentionDays}
                    value={stage.end_day}
                    onChange={(v) => v && updateStage(index, 'end_day', v)}
                    style={{ width: 60 }}
                  />
                  <span className="access-custom-stage-label">天:</span>
                  <InputNumber
                    size="small"
                    min={0}
                    max={100}
                    value={Math.round(stage.access_rate * 100)}
                    onChange={(v) => v !== null && updateStage(index, 'access_rate', v / 100)}
                    formatter={(v) => `${v}%`}
                    parser={(v) => Number(v?.replace('%', '') || 0)}
                    style={{ width: 70 }}
                  />
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeStage(index)}
                  disabled={customStages.length <= 1}
                  className="access-custom-delete-btn"
                />
              </div>
            ))}
          </div>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={addStage}
            block
            className="access-custom-add-btn"
            disabled={customStages[customStages.length - 1]?.end_day >= retentionDays}
          >
            添加时间段
          </Button>
        </div>
      )}
    </div>
  );
};

export default CustomValueInput;