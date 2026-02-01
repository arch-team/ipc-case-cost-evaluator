/**
 * 布局组件
 */
import React, { useState, useMemo, useContext } from 'react';
import { Layout as AntLayout, Menu, Typography, Space, Breadcrumb, Tag, Tooltip, Button, Divider } from 'antd';
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
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../types/auth';

const { Header, Content, Footer, Sider } = AntLayout;
const { Title, Text } = Typography;

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
      // 访客 - 直接显示"需登录"说明，减少交互成本
      items.push(
        {
          key: '/calculation-records',
          icon: <UnorderedListOutlined style={{ opacity: 0.5 }} />,
          label: collapsed ? (
            <Tooltip title="需登录" placement="right">
              <span style={{ opacity: 0.5 }}>核算记录</span>
            </Tooltip>
          ) : (
            <span style={{ opacity: 0.5 }}>
              核算记录 <Text type="secondary" style={{ fontSize: 10, marginLeft: 2 }}>(需登录)</Text>
            </span>
          ),
          disabled: true,
        },
        {
          key: '/evaluations',
          icon: <HistoryOutlined style={{ opacity: 0.5 }} />,
          label: collapsed ? (
            <Tooltip title="需登录" placement="right">
              <span style={{ opacity: 0.5 }}>评估记录</span>
            </Tooltip>
          ) : (
            <span style={{ opacity: 0.5 }}>
              评估记录 <Text type="secondary" style={{ fontSize: 10, marginLeft: 2 }}>(需登录)</Text>
            </span>
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

    // 账户菜单 - 仅登录用户显示在菜单中
    // 访客的登录入口改为侧边栏底部独立区域，避免与功能菜单混淆
    if (isAuthenticated) {
      items.push({
        key: '/settings',
        icon: <UserOutlined />,
        label: '账户',
      });
    }

    return items;
  }, [isAdmin, isUser, isAuthenticated, collapsed]);

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

          {/* 访客身份区域 - 独立于功能菜单，固定在底部 */}
          {!isAuthenticated && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: collapsed ? '12px 8px' : '12px 16px',
                borderTop: '1px solid #f0f0f0',
                background: '#fafafa',
              }}
            >
              {collapsed ? (
                // 折叠状态：只显示登录图标按钮
                <Tooltip title="点击登录" placement="right">
                  <Button
                    type="primary"
                    icon={<LoginOutlined />}
                    onClick={() => navigate('/settings')}
                    style={{ width: '100%' }}
                  />
                </Tooltip>
              ) : (
                // 展开状态：显示完整的访客信息
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 8,
                    color: '#666',
                    fontSize: 12,
                  }}>
                    <UserOutlined />
                    <span>当前为访客身份</span>
                  </div>
                  <Button
                    type="primary"
                    icon={<LoginOutlined />}
                    onClick={() => navigate('/settings')}
                    size="small"
                    block
                  >
                    登录 / 注册
                  </Button>
                  <div style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: '#999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    计算功能可用
                  </div>
                </div>
              )}
            </div>
          )}
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
              <Space size={4}>
                <Tag color="default" style={{ margin: 0 }}>
                  <UserOutlined style={{ marginRight: 4 }} />
                  访客
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  计算功能可用
                </Text>
              </Space>
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
