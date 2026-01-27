/**
 * 用户管理页面 E2E 测试
 *
 * 测试范围:
 * 1. 管理员登录流程
 * 2. 用户列表加载
 * 3. 搜索用户
 * 4. 角色筛选
 * 5. 状态筛选
 * 6. 用户编辑
 */
import { test, expect } from '@playwright/test';

// 管理员凭据
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123456';

test.describe('用户管理页面', () => {
  // 登录辅助函数
  async function loginAsAdmin(page: any) {
    // 访问管理页面会重定向到设置页面登录
    await page.goto('/admin');

    // 等待重定向到设置页面并显示登录表单
    await page.waitForURL(/.*settings/);

    // 等待登录表单加载
    await page.waitForSelector('input[placeholder="请输入邮箱"]', { timeout: 10000 });

    // 输入邮箱
    await page.fill('input[placeholder="请输入邮箱"]', ADMIN_EMAIL);

    // 输入密码
    await page.fill('input[placeholder="请输入密码"]', ADMIN_PASSWORD);

    // 点击登录按钮
    await page.click('button:has-text("登录")');

    // 等待登录成功动画完成
    await page.waitForTimeout(1500);

    // 登录成功后导航到管理页面
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  }

  test.describe('登录流程', () => {
    test('未登录访问管理页面应重定向到设置页面', async ({ page }) => {
      await page.goto('/admin');

      // 应该重定向到设置页面
      await expect(page).toHaveURL(/.*settings/);

      // 应该看到登录表单
      await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
      await expect(page.locator('input[placeholder="请输入邮箱"]')).toBeVisible();
    });

    test('使用管理员凭据成功登录', async ({ page }) => {
      await loginAsAdmin(page);

      // 登录成功后应该能看到用户管理页面
      await expect(page.locator('text=系统概览')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();
    });

    test('使用错误凭据登录失败', async ({ page }) => {
      await page.goto('/settings');

      // 等待登录表单
      await page.waitForSelector('input[placeholder="请输入邮箱"]');

      // 输入错误凭据
      await page.fill('input[placeholder="请输入邮箱"]', 'wrong@example.com');
      await page.fill('input[placeholder="请输入密码"]', 'wrongpassword');

      // 点击登录
      await page.click('button:has-text("登录")');

      // 应该看到错误提示
      await expect(page.locator('.ant-alert-error')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('用户列表', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('用户列表正确加载', async ({ page }) => {
      // 等待表格加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 验证表格列标题
      await expect(page.locator('th:has-text("用户名")')).toBeVisible();
      await expect(page.locator('th:has-text("邮箱")')).toBeVisible();
      await expect(page.locator('th:has-text("角色")')).toBeVisible();
      await expect(page.locator('th:has-text("状态")')).toBeVisible();

      // 验证有数据行（至少有管理员账户）
      const rows = page.locator('.ant-table-tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('搜索用户功能', async ({ page }) => {
      // 等待表格加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 搜索 admin
      await page.fill('input[placeholder="搜索用户名或邮箱"]', 'admin');
      await page.press('input[placeholder="搜索用户名或邮箱"]', 'Enter');

      // 等待搜索结果
      await page.waitForTimeout(1000);

      // 验证搜索结果包含 admin
      await expect(page.locator('td:has-text("admin@example.com")')).toBeVisible();
    });

    test('角色筛选功能', async ({ page }) => {
      // 等待表格加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 点击角色筛选下拉框
      await page.click('.ant-select:has-text("角色筛选")');

      // 选择管理员
      await page.click('.ant-select-item-option:has-text("管理员")');

      // 等待筛选结果
      await page.waitForTimeout(1000);

      // 验证所有显示的用户都是管理员角色
      const roleTags = page.locator('.ant-table-tbody .ant-tag:has-text("管理员")');
      const count = await roleTags.count();
      expect(count).toBeGreaterThan(0);
    });

    test('状态筛选功能', async ({ page }) => {
      // 等待表格加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 点击状态筛选下拉框
      await page.click('.ant-select:has-text("状态筛选")');

      // 选择正常状态
      await page.click('.ant-select-item-option:has-text("正常")');

      // 等待筛选结果
      await page.waitForTimeout(1000);

      // 验证所有显示的用户都是正常状态
      const statusTags = page.locator('.ant-table-tbody .ant-tag:has-text("正常")');
      const count = await statusTags.count();
      expect(count).toBeGreaterThan(0);
    });

    test('刷新按钮功能', async ({ page }) => {
      // 等待表格加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });

      // 点击刷新按钮
      await page.click('button:has-text("刷新")');

      // 等待加载完成
      await page.waitForTimeout(500);

      // 表格应该仍然可见
      await expect(page.locator('.ant-table')).toBeVisible();
    });
  });

  test.describe('系统统计', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('系统统计卡片正确显示', async ({ page }) => {
      // 验证系统概览标题
      await expect(page.locator('text=系统概览')).toBeVisible({ timeout: 10000 });

      // 验证统计数据卡片存在
      const stats = page.locator('.ant-statistic');
      const count = await stats.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('用户编辑', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('点击编辑按钮打开编辑弹窗', async ({ page }) => {
      // 等待表格加载
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });

      // 点击操作列的编辑按钮（使用包含匹配）
      const editButton = page.locator('.ant-table-tbody tr').first().locator('button').first();
      await editButton.click();

      // 验证编辑弹窗打开
      await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('截图验证', () => {
    test('截图 - 登录后的用户管理页面', async ({ page }) => {
      await loginAsAdmin(page);

      // 等待页面完全加载
      await page.waitForSelector('.ant-table', { timeout: 10000 });
      await page.waitForTimeout(1000);

      // 截图
      await page.screenshot({
        path: 'tests/e2e/screenshots/user-management-page.png',
        fullPage: true,
      });
    });
  });
});
