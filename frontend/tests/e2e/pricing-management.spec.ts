/**
 * 定价管理页面 E2E 测试
 *
 * 测试管理员登录后的定价数据管理功能
 */
import { test, expect, Page } from '@playwright/test';

// 测试配置
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123456';
const BASE_URL = 'http://localhost:5173';

test.describe('定价管理功能测试', () => {
  // 登录辅助函数
  async function login(page: Page) {
    // 访问设置页面触发登录表单
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // 检查是否显示登录表单
    const emailInput = page.getByPlaceholder('请输入邮箱');
    if (await emailInput.isVisible({ timeout: 5000 })) {
      // 填写登录表单
      await emailInput.fill(ADMIN_EMAIL);
      await page.getByPlaceholder('请输入密码').fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /登录/ }).click();

      // 等待登录成功
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
  }

  test.beforeEach(async ({ page }) => {
    // 登录管理员账号
    await login(page);
  });

  test('管理员可以访问定价管理页面', async ({ page }) => {
    // 访问定价管理页面
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 验证页面加载
    await expect(page.getByText('定价数据管理')).toBeVisible({ timeout: 10000 });
  });

  test('定价管理页面显示服务状态', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 检查服务状态标签页
    await expect(page.getByRole('tab', { name: /服务状态/ })).toBeVisible({ timeout: 10000 });
    // 使用更精确的选择器
    await expect(page.locator('.ant-statistic-title').filter({ hasText: 'AWS API' }).first()).toBeVisible();
    await expect(page.getByText(/可用区域/)).toBeVisible();
  });

  test('定价管理页面显示区域选择器', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 检查区域选择器
    await expect(page.getByText('选择 AWS 区域')).toBeVisible({ timeout: 10000 });

    // 等待区域数据加载
    await page.waitForTimeout(1000);

    // 检查区域选择器是否有值（使用更通用的选择器）
    const regionInfo = page.locator('text=Asia Pacific (Tokyo)').first();
    await expect(regionInfo).toBeVisible({ timeout: 5000 });
  });

  test('切换区域后加载对应定价数据', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 点击区域选择器
    await page.locator('.ant-select').first().click();
    await page.waitForTimeout(500);

    // 选择新区域
    await page.getByText('US West (Oregon)').click();

    // 等待数据更新
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 检查区域信息更新
    await expect(page.locator('text=US West (Oregon)').first()).toBeVisible({ timeout: 5000 });
  });

  test('定价表格显示存储类型', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 等待表格加载
    await expect(page.getByText('存储类型定价')).toBeVisible({ timeout: 10000 });

    // 检查存储类型（使用更新后的名称）
    await expect(page.getByText('S3 Standard')).toBeVisible();
    await expect(page.getByText('S3 Glacier IR')).toBeVisible();
  });

  test('定价表格显示数据传输费率', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 等待表格加载
    await expect(page.getByText('数据传输出站定价')).toBeVisible({ timeout: 10000 });

    // 检查阶梯定价
    await expect(page.getByText('前 10 TB')).toBeVisible();
    await expect(page.getByText('10-50 TB')).toBeVisible();
  });

  test('刷新定价数据按钮可用', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 查找刷新按钮
    const refreshButton = page.getByRole('button', { name: /刷新定价数据/ });
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
    await expect(refreshButton).toBeEnabled();
  });

  test('点击刷新按钮执行刷新操作', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 点击刷新按钮
    const refreshButton = page.getByRole('button', { name: /刷新定价数据/ });
    await refreshButton.click();

    // 等待操作完成（检查成功消息）
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 });

    // 验证按钮恢复可用
    await expect(refreshButton).toBeEnabled({ timeout: 5000 });
  });

  test('帮助说明标签页显示正确', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 点击帮助说明标签
    await page.getByRole('tab', { name: /帮助说明/ }).click();

    // 检查帮助内容
    await expect(page.getByText('数据来源说明')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('缓存策略')).toBeVisible();
    await expect(page.getByText('回退机制')).toBeVisible();
  });

  test('缓存状态卡片显示进度条', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);
    await page.waitForLoadState('networkidle');

    // 检查缓存状态卡片
    await expect(page.getByText('缓存状态')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('缓存有效期剩余')).toBeVisible();

    // 检查进度条存在
    await expect(page.locator('.ant-progress')).toBeVisible();
  });

  test('页面截图用于 UI 审查', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 截取完整页面
    await page.screenshot({
      path: 'tests/e2e/screenshots/pricing-management-full.png',
      fullPage: true,
    });

    // 截取头部区域
    await page.screenshot({
      path: 'tests/e2e/screenshots/pricing-management-header.png',
      clip: { x: 0, y: 0, width: 1280, height: 500 },
    });
  });
});
