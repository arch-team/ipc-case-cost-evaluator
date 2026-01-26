/**
 * 加载动画组件
 */
import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  /** 加载提示文字 */
  tip?: string;
  /** 大小：small | default | large */
  size?: 'small' | 'default' | 'large';
  /** 是否全屏显示 */
  fullscreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  tip = '加载中...',
  size = 'default',
  fullscreen = false,
}) => {
  const iconSize = size === 'small' ? 24 : size === 'large' ? 48 : 32;
  const antIcon = <LoadingOutlined style={{ fontSize: iconSize }} spin />;

  if (fullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
        }}
      >
        <Spin indicator={antIcon} tip={tip} size={size} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minHeight: 200,
      }}
    >
      <Spin indicator={antIcon} tip={tip} size={size} />
    </div>
  );
};

export default LoadingSpinner;
