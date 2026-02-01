/**
 * 首页
 */
import React, { useRef, useState, useEffect } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { calculationRecordApi } from '../api/calculationRecords';
import { adminApi } from '../api/adminApi';
import type { CalculationRecordSummary } from '../types/calculationRecords';
import type { SystemStats } from '../types/auth';
import { devLog } from '../utils/errors';
import {
  HeroSection,
  UserDashboard,
  AdminOverview,
  QuickStartSteps,
  FeatureCards,
} from '../components/home';

// 本地存储键
const TOUR_COMPLETED_KEY = 'ipc_cost_evaluator_tour_completed';

const Home: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [tourOpen, setTourOpen] = useState(false);

  // 用户个性化数据状态
  const [recentRecords, setRecentRecords] = useState<CalculationRecordSummary[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [userDataLoading, setUserDataLoading] = useState(false);

  // 管理员系统统计状态
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [adminDataLoading, setAdminDataLoading] = useState(false);

  // Tour 目标元素引用
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const historyBtnRef = useRef<HTMLButtonElement>(null);
  const featureCardRef = useRef<HTMLDivElement>(null);

  // 检查是否需要显示引导
  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!tourCompleted) {
      // 延迟显示，让页面先渲染完成
      const timer = setTimeout(() => setTourOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // 加载用户个性化数据
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated) return;

      setUserDataLoading(true);
      try {
        // 并行加载记录数量和最近记录
        const [countRes, listRes] = await Promise.all([
          calculationRecordApi.getCount(),
          calculationRecordApi.list({ page: 1, page_size: 3, sort_by: 'created_at', sort_order: 'desc' }),
        ]);
        setRecordCount(countRes.count);
        setRecentRecords(listRes.items);
      } catch (error) {
        devLog.error('加载用户数据失败:', error);
      } finally {
        setUserDataLoading(false);
      }
    };
    loadUserData();
  }, [isAuthenticated]);

  // 加载管理员系统统计数据
  useEffect(() => {
    const loadAdminData = async () => {
      if (!isAdmin) return;

      setAdminDataLoading(true);
      try {
        const stats = await adminApi.getStats();
        setSystemStats(stats);
      } catch (error) {
        devLog.error('加载系统统计失败:', error);
      } finally {
        setAdminDataLoading(false);
      }
    };
    loadAdminData();
  }, [isAdmin]);

  // Tour 步骤配置
  const tourSteps: TourProps['steps'] = [
    {
      title: '欢迎使用 IPC 成本评估系统',
      description: '这是一个帮助您评估 AWS S3 云存储成本的工具。让我们快速了解一下主要功能。',
      target: null,
      placement: 'center',
    },
    {
      title: '开始成本评估',
      description: '点击这里开始配置您的 IPC 设备参数，系统将自动计算存储成本。',
      target: () => startBtnRef.current!,
      placement: 'bottom',
    },
    {
      title: '查看历史记录',
      description: '您的所有评估记录都会保存在这里，方便随时查看和对比。',
      target: () => historyBtnRef.current!,
      placement: 'bottom',
    },
    {
      title: '核心功能介绍',
      description: '系统支持精准计算、多方案对比、成本优化建议和报告导出等功能。',
      target: () => featureCardRef.current!,
      placement: 'top',
    },
  ];

  // 完成引导
  const handleTourFinish = () => {
    setTourOpen(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  };

  // 重新开始引导
  const handleRestartTour = () => {
    setTourOpen(true);
  };

  return (
    <div>
      {/* 新用户引导 Tour */}
      <Tour
        open={tourOpen}
        onClose={handleTourFinish}
        onFinish={handleTourFinish}
        steps={tourSteps}
        indicatorsRender={(current, total) => (
          <span>{current + 1} / {total}</span>
        )}
      />

      {/* Hero 区域 */}
      <HeroSection
        startBtnRef={startBtnRef}
        historyBtnRef={historyBtnRef}
        onRestartTour={handleRestartTour}
      />

      {/* 用户个性化区域 - 仅登录用户可见 */}
      {isAuthenticated && user && (
        <UserDashboard
          user={user}
          recentRecords={recentRecords}
          recordCount={recordCount}
          userDataLoading={userDataLoading}
        />
      )}

      {/* 管理员系统概览 */}
      {isAdmin && systemStats && (
        <AdminOverview
          systemStats={systemStats}
          adminDataLoading={adminDataLoading}
        />
      )}

      {/* 快速开始步骤 - 访客可见 */}
      {!isAuthenticated && <QuickStartSteps />}

      {/* 功能卡片区 */}
      <FeatureCards featureCardRef={featureCardRef} />
    </div>
  );
};

export default Home;