/**
 * 应用入口组件
 */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/common/Layout';
import Home from './pages/Home';
import Calculator from './pages/Calculator';
import Evaluations from './pages/Evaluations';
import Settings from './pages/Settings';

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
