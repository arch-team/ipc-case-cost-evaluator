/**
 * 受保护路由组件
 *
 * 基于角色的路由保护，未登录或权限不足时重定向到设置页面。
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth';
import { ROLE_LABELS } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 最低要求的角色 */
  minRole?: UserRole;
  /** 自定义未登录时的跳转路径 */
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  minRole = 'user',
  redirectTo = '/settings',
}) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  // 加载中
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" tip="验证身份中..." />
      </div>
    );
  }

  // 未登录
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname, message: '请先登录' }}
        replace
      />
    );
  }

  // 权限不足
  if (!hasRole(minRole)) {
    return (
      <Result
        status="403"
        title="权限不足"
        subTitle={`此页面需要 ${ROLE_LABELS[minRole]} 或更高权限`}
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上一页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
