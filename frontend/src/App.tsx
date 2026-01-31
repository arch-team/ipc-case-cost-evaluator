/**
 * 应用入口组件
 */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Calculator from './pages/Calculator';
import DetailedCalculation from './pages/DetailedCalculation';
import Evaluations from './pages/Evaluations';
import EvaluationDetail from './pages/EvaluationDetail';
import Settings from './pages/Settings';
import SharedView from './pages/SharedView';
import AdminPage from './pages/AdminPage';
import UserManagementPage from './pages/admin/UserManagementPage';

// 企业级稳重风格主题配置
const customTheme = {
  token: {
    // 主色调 - 更沉稳的蓝
    colorPrimary: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#0284c7',

    // 中性色
    colorText: '#1e293b',
    colorTextSecondary: '#64748b',
    colorTextTertiary: '#94a3b8',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8fafc',

    // 圆角
    borderRadius: 6,
    borderRadiusLG: 12,
    borderRadiusSM: 4,

    // 字体
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
  },
  algorithm: theme.defaultAlgorithm,
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={customTheme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 分享查看页面 - 独立布局 */}
            <Route path="/shared/:token" element={<SharedView />} />
            {/* 主应用布局 */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="calculator" element={<Calculator />} />
              <Route path="detailed-calculation" element={<DetailedCalculation />} />
              <Route
                path="evaluations"
                element={
                  <ProtectedRoute minRole="user">
                    <Evaluations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="evaluations/:id"
                element={
                  <ProtectedRoute minRole="user">
                    <EvaluationDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <ProtectedRoute minRole="admin">
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/pricing"
                element={
                  <ProtectedRoute minRole="admin">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
