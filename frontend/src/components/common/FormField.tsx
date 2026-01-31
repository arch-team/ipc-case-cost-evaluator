/**
 * 通用表单字段组件
 * 减少表单中的重复代码，提供统一的字段渲染逻辑
 */
import React from 'react';
import { Form, InputNumber, Select } from 'antd';
import { FormLabel } from './FormLabel';

interface BaseFormFieldProps {
  label: string;
  tooltip?: string;
  required?: boolean;
}

interface InputNumberFieldProps extends BaseFormFieldProps {
  type: 'number';
  value: number | undefined | null;
  onChange: (value: number | undefined | null) => void;
  min?: number;
  max?: number;
  addonAfter?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  placeholder?: string;
}

interface SelectFieldProps<T = string> extends BaseFormFieldProps {
  type: 'select';
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  style?: React.CSSProperties;
  disabled?: boolean;
  placeholder?: string;
}

type FormFieldProps<T = string> = InputNumberFieldProps | SelectFieldProps<T>;

/**
 * 通用表单字段组件
 * 根据 type 渲染不同的表单控件
 */
export function FormField<T = string>(props: FormFieldProps<T>): React.ReactElement {
  const { label, tooltip, required = false } = props;

  const renderControl = () => {
    switch (props.type) {
      case 'number':
        return (
          <InputNumber
            min={props.min}
            max={props.max}
            value={props.value}
            onChange={props.onChange}
            addonAfter={props.addonAfter}
            style={{ width: '100%', ...props.style }}
            disabled={props.disabled}
            placeholder={props.placeholder}
          />
        );

      case 'select':
        return (
          <Select
            value={props.value}
            onChange={props.onChange}
            options={props.options}
            style={{ width: '100%', ...props.style }}
            disabled={props.disabled}
            placeholder={props.placeholder}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Form.Item
      label={<FormLabel label={label} tooltip={tooltip} />}
      required={required}
    >
      {renderControl()}
    </Form.Item>
  );
}

/**
 * 批量渲染表单字段的辅助函数
 */
export function renderFormFields(fields: FormFieldProps[]): React.ReactElement[] {
  return fields.map((field, index) => (
    <FormField key={`${field.label}-${index}`} {...field} />
  ));
}