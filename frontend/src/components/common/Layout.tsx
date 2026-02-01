/**
 * 布局组件
 */
import React, { useState, useMemo, useContext } from 'react';
import { Layout as AntLayout, Menu, Typography, Space, Breadcrumb, Tag, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  CalculatorOutlined,
  HistoryOutlined,
  UserOutlined,
  HomeOutlined,
  LeftOutlined,
  RightOutlined,
  CloudServerOutlined,
  TeamOutlined,
  DollarOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  LockOutlined,
  LoginOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../types/auth';

const { Header, Content, Footer, Sider } = AntLayout;
const { Title } = Typography;

// 路由到面包屑的映射
const breadcrumbNameMap: Record<string, string> = {
  '/': '首页',
  '/calculator': '成本计算',
  '/detailed-calculation': '详细核算',
  '/calculation-records': '核算记录',
  '/calculation-records/comparison': '记录对比',
  '/evaluations': '评估记录',
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
        key: '/calculator',
        icon: <CalculatorOutlined />,
        label: '成本计算',
      },
      {
        key: '/detailed-calculation',
        icon: <FileTextOutlined />,
        label: '详细核算',
      },
    ];

    // 核算记录和评估记录 - 根据登录状态显示不同样式
    if (isUser) {
      // 已登录用户 - 正常显示
      items.push(
        {
          key: '/calculation-records',
          icon: <UnorderedListOutlined />,
          label: '核算记录',
        },
        {
          key: '/evaluations',
          icon: <HistoryOutlined />,
          label: '评估记录',
        }
      );
    } else {
      // 访客 - 显示锁定提示
      items.push(
        {
          key: '/calculation-records',
          icon: <UnorderedListOutlined />,
          label: (
            <Tooltip title="登录后可查看核算记录" placement="right">
              <span style={{ opacity: 0.5 }}>
                核算记录 <LockOutlined style={{ fontSize: 10, marginLeft: 4 }} />
              </span>
            </Tooltip>
          ),
          disabled: true,
        },
        {
          key: '/evaluations',
          icon: <HistoryOutlined />,
          label: (
            <Tooltip title="登录后可查看评估记录" placement="right">
              <span style={{ opacity: 0.5 }}>
                评估记录 <LockOutlined style={{ fontSize: 10, marginLeft: 4 }} />
              </span>
            </Tooltip>
          ),
          disabled: true,
        }
      );
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

    // 账户菜单 - 根据登录状态显示不同文案
    items.push({
      key: '/settings',
      icon: isAuthenticated ? <UserOutlined /> : <LoginOutlined />,
      label: isAuthenticated ? '账户' : '登录',
    });

    return items;
  }, [isAdmin, isUser, isAuthenticated]);

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
          <Space>
            <span style={{ color: '#999', fontSize: 13 }}>
              AWS S3 云存储成本评估系统
            </span>
            {isAuthenticated && user && (
              <>
                <span style={{ color: '#333', fontSize: 13, marginLeft: 16 }}>
                  <UserOutlined style={{ marginRight: 4 }} />
                  {user.name || user.email?.split('@')[0]}
                </span>
                <Tag color={isAdmin ? 'gold' : 'blue'}>
                  {ROLE_LABELS[user.role] || user.role}
                </Tag>
              </>
            )}
            {!isAuthenticated && (
              <Tag color="default">
                访客模式
              </Tag>
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
