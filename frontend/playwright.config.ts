/**
 * Playwright E2E 测试配置
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  // 全局超时设置
  timeout: 30000,

  // 单个测试的期望超时
  expect: {
    timeout: 5000,
  },

  // 完全并行运行测试
  fullyParallel: true,

  // 失败时禁止重试（CI 环境中可以启用）
  retries: process.env.CI ? 2 : 0,

  // 限制并行工作进程数
  workers: process.env.CI ? 1 : undefined,

  // 报告器配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // 全局测试配置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:5174',

    // 收集测试轨迹（失败时）
    trace: 'on-first-retry',

    // 失败时截图
    screenshot: 'only-on-failure',

    // 失败时录制视频
    video: 'on-first-retry',

    // 默认超时
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  // 浏览器项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web 服务器配置（可选：自动启动前端服务）
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
