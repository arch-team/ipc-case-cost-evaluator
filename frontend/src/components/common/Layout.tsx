/**
 * 布局组件
 */
import React, { useState, useMemo, useContext } from 'react';
import { Layout as AntLayout, Menu, Typography, Breadcrumb, Tag, Tooltip, Button, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
  BarChartOutlined,
  HistoryOutlined,
  UserOutlined,
  HomeOutlined,
  LeftOutlined,
  RightOutlined,
  CloudServerOutlined,
  TeamOutlined,
  DollarOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const { Header, Content, Footer, Sider } = AntLayout;
const { Title, Text } = Typography;

// 路由到面包屑的映射
const breadcrumbNameMap: Record<string, string> = {
  '/': '首页',
  '/cost-analysis': '成本分析',
  '/pricing': 'AWS服务定价',
  '/history': '历史记录',
  '/calculation-records/comparison': '记录对比',
  '/admin': '用户管理',
  '/admin/pricing': '定价管理',
  '/admin/system': '系统监控',
  '/settings': '账户',
};

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const logout = authContext?.logout;

  // 判断角色
  const isAdmin = user?.role === 'admin';
  const isUser = isAuthenticated && (user?.role === 'user' || user?.role === 'admin');

  // 根据用户角色动态生成菜单
  const menuItems = useMemo(() => {
    const items: MenuProps['items'] = [
      {
        key: '/',
        icon: <HomeOutlined />,
        label: '首页',
      },
      {
        key: '/cost-analysis',
        icon: <BarChartOutlined />,
        label: '成本分析',
      },
    ];

    // AWS服务定价 - 仅非管理员用户显示（管理员在管理中心已有定价管理）
    if (!isAdmin) {
      items.push({
        key: '/pricing',
        icon: <DollarOutlined />,
        label: 'AWS服务定价',
      });
    }

    // 历史记录 - 根据登录状态显示不同样式
    if (isUser) {
      // 已登录用户 - 正常显示
      items.push({
        key: '/history',
        icon: <HistoryOutlined />,
        label: '历史记录',
      });
    } else {
      // 访客 - 直接显示"需登录"说明，减少交互成本
      items.push({
        key: '/history',
        icon: <HistoryOutlined style={{ opacity: 0.5 }} />,
        label: collapsed ? (
          <Tooltip title="需登录" placement="right">
            <span style={{ opacity: 0.5 }}>历史记录</span>
          </Tooltip>
        ) : (
          <span style={{ opacity: 0.5 }}>
            历史记录 <Text type="secondary" style={{ fontSize: 10, marginLeft: 2 }}>(需登录)</Text>
          </span>
        ),
        disabled: true,
      });
    }

    // 管理员菜单
    if (isAdmin) {
      items.push({
        key: 'admin-group',
        icon: <CloudServerOutlined />,
        label: '管理中心',
        children: [
          {
            key: '/admin',
            icon: <TeamOutlined />,
            label: '用户管理',
          },
          {
            key: '/admin/pricing',
            icon: <DollarOutlined />,
            label: '定价管理',
          },
          {
            key: '/admin/system',
            icon: <DashboardOutlined />,
            label: '系统监控',
          },
        ],
      });
    }

    return items;
  }, [isAdmin, isUser, collapsed]);

  // 计算当前选中的菜单项和展开的子菜单
  const selectedKeys = useMemo(() => {
    return [location.pathname];
  }, [location.pathname]);

  const openKeys = useMemo(() => {
    if (location.pathname.startsWith('/admin')) {
      return ['admin-group'];
    }
    return [];
  }, [location.pathname]);

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* 侧边栏容器 */}
      <div style={{ position: 'relative' }}>
        <Sider
          theme="light"
          collapsed={collapsed}
          trigger={null}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div style={{
            padding: '16px 0',
            margin: collapsed ? '0 8px' : '0 16px',
            textAlign: 'center'
          }}>
            <Title level={4} style={{ margin: 0, color: '#1890ff', fontSize: collapsed ? 14 : 18 }}>
              {collapsed ? 'IPC' : 'IPC 成本评估'}
            </Title>
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={openKeys}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 'none' }}
          />
        </Sider>
        {/* 折叠按钮 - 位于侧边栏边缘 */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-collapse-btn"
          style={{
            position: 'fixed',
            left: collapsed ? 70 : 190,
            top: 72,
            width: 28,
            height: 28,
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            borderRadius: '50%',
            boxShadow: '0 2px 6px rgba(24, 144, 255, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 101,
            transition: 'all 0.2s ease',
            border: '2px solid #fff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(24, 144, 255, 0.35)';
          }}
        >
          {collapsed ? (
            <RightOutlined style={{ fontSize: 12, color: '#fff' }} />
          ) : (
            <LeftOutlined style={{ fontSize: 12, color: '#fff' }} />
          )}
        </div>
      </div>
      <AntLayout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            height: 56,
          }}
        >
          <Breadcrumb
            items={
              location.pathname === '/'
                ? [{ title: <><HomeOutlined /> 首页</> }]
                : [
                    { title: <Link to="/"><HomeOutlined /></Link> },
                    { title: breadcrumbNameMap[location.pathname] || '未知页面' },
                  ]
            }
            style={{ fontSize: 14 }}
          />
          <Space size={12}>
            {/* 模式标签 */}
            <Tag color={isAdmin ? 'gold' : isAuthenticated ? 'blue' : 'default'}>
              {isAdmin ? '管理员模式' : isAuthenticated ? '用户模式' : '访客模式'}
            </Tag>

            {isAuthenticated && user ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'settings',
                      icon: <SettingOutlined />,
                      label: '账户设置',
                      onClick: () => navigate('/settings'),
                    },
                    {
                      type: 'divider',
                    },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: '退出登录',
                      onClick: () => {
                        logout?.();
                        navigate('/');
                      },
                    },
                  ],
                }}
                placement="bottomRight"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <UserOutlined style={{ color: '#333', fontSize: 14 }} />
                  <span style={{ color: '#333', fontSize: 13 }}>
                    {user.name || user.email?.split('@')[0]}
                  </span>
                  <DownOutlined style={{ color: '#999', fontSize: 10 }} />
                </div>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => navigate('/settings')}
              >
                登录 / 注册
              </Button>
            )}
          </Space>
        </Header>
        <Content
          className="page-content"
          key={location.pathname}
          style={{
            margin: '12px 12px 12px 4px',
            padding: 12,
            minHeight: 280,
            background: '#f5f5f5',
          }}
        >
          <Outlet />
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          IPC Cloud Storage Cost Evaluator ©{new Date().getFullYear()}
        </Footer>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
