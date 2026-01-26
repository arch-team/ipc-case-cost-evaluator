/**
 * 表格骨架屏组件
 */
import React from 'react';
import { Skeleton, Card } from 'antd';

interface TableSkeletonProps {
  /** 行数 */
  rows?: number;
  /** 列数 */
  columns?: number;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 是否激活动画 */
  active?: boolean;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  active = true,
  style,
}) => {
  return (
    <Card style={style}>
      {/* 表头 */}
      {showHeader && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16,
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton.Input
              key={`header-${index}`}
              active={active}
              size="small"
              style={{ width: '80%', minWidth: 60 }}
            />
          ))}
        </div>
      )}

      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16,
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: rowIndex < rows - 1 ? '1px solid #f0f0f0' : 'none',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton.Input
              key={`cell-${rowIndex}-${colIndex}`}
              active={active}
              size="small"
              style={{ width: '90%', minWidth: 40 }}
            />
          ))}
        </div>
      ))}
    </Card>
  );
};

export default TableSkeleton;
