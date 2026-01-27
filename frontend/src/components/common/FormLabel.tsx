/**
 * 表单标签组件
 *
 * 统一的表单标签组件，支持 Tooltip 提示
 */
import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface FormLabelProps {
  /** 标签文本 */
  label: string;
  /** 提示信息 */
  tooltip?: string;
  /** 是否必填 */
  required?: boolean;
}

/**
 * 带提示信息的表单标签
 */
export function FormLabel({ label, tooltip, required }: FormLabelProps): React.ReactElement {
  return (
    <span>
      {required && <span style={{ color: 'red', marginRight: 4 }}>*</span>}
      {label}
      {tooltip && (
        <>
          {' '}
          <Tooltip title={tooltip}>
            <QuestionCircleOutlined />
          </Tooltip>
        </>
      )}
    </span>
  );
}

export default FormLabel;