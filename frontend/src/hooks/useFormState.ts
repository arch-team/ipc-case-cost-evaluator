/**
 * 通用表单状态管理 Hook
 * 减少表单组件中的重复逻辑
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';

interface UseFormStateOptions<T> {
  initialValue: T;
  onSubmit?: (value: T) => void | Promise<void>;
  validateOnChange?: boolean;
  validator?: (value: T) => string | null;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface UseFormStateReturn<T> {
  value: T;
  setValue: (value: T) => void;
  updateField: <K extends keyof T>(field: K, val: T[K]) => void;
  errors: Record<string, string>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  reset: () => void;
  submit: () => Promise<void>;
  clearErrors: () => void;
}

/**
 * 通用表单状态管理 Hook
 */
export function useFormState<T extends Record<string, any>>(
  options: UseFormStateOptions<T>
): UseFormStateReturn<T> {
  const {
    initialValue,
    onSubmit,
    validateOnChange = false,
    validator,
    autoSave = false,
    autoSaveDelay = 1000,
  } = options;

  const [value, setValue] = useState<T>(initialValue);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValueRef = useRef<T>(initialValue);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 更新单个字段
  const updateField = useCallback(
    <K extends keyof T>(field: K, val: T[K]) => {
      setValue((prev) => {
        const newValue = { ...prev, [field]: val };

        // 标记表单已修改
        setIsDirty(true);

        // 验证
        if (validateOnChange && validator) {
          const error = validator(newValue);
          if (error) {
            setErrors((prevErrors) => ({ ...prevErrors, [field]: error }));
          } else {
            setErrors((prevErrors) => {
              const { [field as string]: _, ...rest } = prevErrors;
              return rest;
            });
          }
        }

        // 自动保存
        if (autoSave && onSubmit) {
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
          }
          autoSaveTimerRef.current = setTimeout(() => {
            onSubmit(newValue);
          }, autoSaveDelay);
        }

        return newValue;
      });
    },
    [validateOnChange, validator, autoSave, onSubmit, autoSaveDelay]
  );

  // 重置表单
  const reset = useCallback(() => {
    setValue(initialValueRef.current);
    setErrors({});
    setIsDirty(false);
    setIsSubmitting(false);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  // 清除错误
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // 提交表单
  const submit = useCallback(async () => {
    if (!onSubmit) return;

    // 验证
    if (validator) {
      const error = validator(value);
      if (error) {
        message.error(error);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(value);
      setIsDirty(false);
      message.success('提交成功');
    } catch (error) {
      message.error('提交失败');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [value, validator, onSubmit]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const isValid = Object.keys(errors).length === 0;

  return {
    value,
    setValue,
    updateField,
    errors,
    isValid,
    isDirty,
    isSubmitting,
    reset,
    submit,
    clearErrors,
  };
}

/**
 * 表单字段验证辅助函数
 */
export const FormValidators = {
  required: (fieldName: string) => (value: any) => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName}不能为空`;
    }
    return null;
  },

  min: (fieldName: string, min: number) => (value: number) => {
    if (value < min) {
      return `${fieldName}不能小于${min}`;
    }
    return null;
  },

  max: (fieldName: string, max: number) => (value: number) => {
    if (value > max) {
      return `${fieldName}不能大于${max}`;
    }
    return null;
  },

  range: (fieldName: string, min: number, max: number) => (value: number) => {
    if (value < min || value > max) {
      return `${fieldName}必须在${min}到${max}之间`;
    }
    return null;
  },

  pattern: (fieldName: string, pattern: RegExp, message?: string) => (value: string) => {
    if (!pattern.test(value)) {
      return message || `${fieldName}格式不正确`;
    }
    return null;
  },

  compose: (...validators: Array<(value: any) => string | null>) => (value: any) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  },
};