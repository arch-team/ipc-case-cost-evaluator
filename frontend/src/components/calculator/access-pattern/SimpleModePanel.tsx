/**
 * 简单模式面板 - 单一滑块控制访问比例
 */
import React from 'react';
import { Slider } from 'antd';
import type { SimpleModeProps } from './types';

const SimpleModePanel: React.FC<SimpleModeProps> = ({ accessPattern, onChange }) => {
  const handleChange = (value: number) => {
    onChange(value / 100);
  };

  return (
    <div className="access-simple-slider">
      <Slider
        min={0}
        max={100}
        value={accessPattern * 100}
        onChange={handleChange}
        marks={{
          0: '0%',
          25: '25%',
          50: '50%',
          75: '75%',
          100: '100%',
        }}
      />
    </div>
  );
};

export default SimpleModePanel;