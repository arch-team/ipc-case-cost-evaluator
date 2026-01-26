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

    // 检查服务状态卡片
    await expect(page.getByText('服务状态')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('AWS API')).toBeVisible();
    await expect(page.getByText(/可用区域/)).toBeVisible();
  });

  test('定价管理页面显示区域选择器', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 检查区域选择器
    await expect(page.getByText('选择 AWS 区域')).toBeVisible({ timeout: 10000 });

    // 检查默认选中的区域
    const regionSelect = page.locator('.ant-select-selection-item');
    await expect(regionSelect).toContainText(/Asia Pacific.*Tokyo|ap-northeast-1/);
  });

  test('切换区域后加载对应定价数据', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 点击区域选择器
    await page.locator('.ant-select-selector').first().click();

    // 选择新区域
    await page.getByTitle(/US West.*Oregon/).click();

    // 验证 URL 或数据更新
    await page.waitForLoadState('networkidle');

    // 检查区域信息更新
    await expect(page.getByText(/US West.*Oregon|us-west-2/)).toBeVisible({ timeout: 5000 });
  });

  test('定价表格显示存储类型', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 等待表格加载
    await expect(page.getByText('存储类型定价')).toBeVisible({ timeout: 10000 });

    // 检查存储类型
    await expect(page.getByText('S3 Standard')).toBeVisible();
    await expect(page.getByText('S3 Glacier Instant Retrieval')).toBeVisible();
  });

  test('定价表格显示数据传输费率', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 等待表格加载
    await expect(page.getByText('数据传输出站定价')).toBeVisible({ timeout: 10000 });

    // 检查阶梯定价
    await expect(page.getByText('前 10 TB')).toBeVisible();
    await expect(page.getByText('10-50 TB')).toBeVisible();
  });

  test('刷新定价数据按钮可用', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 查找刷新按钮
    const refreshButton = page.getByRole('button', { name: /刷新定价数据/ });
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
    await expect(refreshButton).toBeEnabled();
  });

  test('点击刷新按钮执行刷新操作', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 点击刷新按钮
    const refreshButton = page.getByRole('button', { name: /刷新定价数据/ });
    await refreshButton.click();

    // 等待刷新完成（按钮会显示 loading 状态）
    await expect(refreshButton).toBeDisabled();

    // 等待操作完成
    await expect(refreshButton).toBeEnabled({ timeout: 10000 });

    // 检查是否有成功消息
    const successMessage = page.locator('.ant-message-success');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('页面底部显示定价数据说明', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/pricing`);

    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 检查说明信息
    await expect(page.getByText('定价数据说明')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('数据来源')).toBeVisible();
    await expect(page.getByText('缓存策略')).toBeVisible();
    await expect(page.getByText('回退机制')).toBeVisible();
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
      clip: { x: 0, y: 0, width: 1280, height: 400 },
    });

    // 截取定价表格区域
    const storageCard = page.locator('text=存储类型定价').locator('..').locator('..');
    if (await storageCard.isVisible()) {
      await storageCard.screenshot({
        path: 'tests/e2e/screenshots/pricing-storage-table.png',
      });
    }
  });
});
