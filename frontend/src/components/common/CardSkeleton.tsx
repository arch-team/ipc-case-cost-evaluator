/**
 * 卡片骨架屏组件
 */
import React from 'react';
import { Card, Skeleton } from 'antd';

interface CardSkeletonProps {
  /** 卡片标题 */
  title?: boolean;
  /** 显示头像占位 */
  avatar?: boolean;
  /** 段落行数 */
  rows?: number;
  /** 是否激活动画 */
  active?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({
  title = true,
  avatar = false,
  rows = 4,
  active = true,
  style,
}) => {
  return (
    <Card style={style}>
      <Skeleton
        active={active}
        avatar={avatar}
        title={title}
        paragraph={{ rows }}
      />
    </Card>
  );
};

export default CardSkeleton;
