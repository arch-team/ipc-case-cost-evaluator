/**
 * 场景选择 E2E 测试
 */
import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages';
import { timeouts } from './fixtures/test-data';

test.describe('场景选择', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
  });

  test('加载预设场景列表', async ({ page }) => {
    // 等待场景加载
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 验证场景卡片存在
    await calculatorPage.scenarioSelector.expectScenariosLoaded();

    // 验证自定义配置卡片存在
    await calculatorPage.scenarioSelector.expectCustomConfigVisible();
  });

  test('显示场景分类', async ({ page }) => {
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 验证分类标题存在（至少有一个分类）
    const categoryTitles = page.locator('h5').filter({
      has: page.locator('.anticon'),
    });
    await expect(categoryTitles.first()).toBeVisible();
  });

  test('点击场景卡片自动填充参数', async ({ page }) => {
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 获取第一个场景卡片的信息
    const scenarioCount = await calculatorPage.scenarioSelector.getScenarioCount();
    expect(scenarioCount).toBeGreaterThan(0);

    // 点击第一个场景
    await calculatorPage.scenarioSelector.selectFirstScenario();

    // 验证跳转到功能配置步骤
    await calculatorPage.expectStep(1);

    // 验证表单已填充值（设备数量应该大于 0）
    const deviceCount = await calculatorPage.functionalForm.getDeviceCount();
    expect(parseInt(deviceCount)).toBeGreaterThan(0);
  });

  test('场景卡片显示标签信息', async ({ page }) => {
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 检查场景卡片上的标签
    const firstCard = page.locator('.ant-card.ant-card-hoverable').first();
    const tags = firstCard.locator('.ant-tag');

    // 每个场景应该有标签（设备数、存储类型、录像模式、保留天数）
    const tagCount = await tags.count();
    expect(tagCount).toBeGreaterThanOrEqual(2);
  });

  test('点击自定义配置进入表单', async ({ page }) => {
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 点击自定义配置
    await calculatorPage.scenarioSelector.clickCustom();

    // 验证跳转到功能配置步骤
    await calculatorPage.expectStep(1);

    // 验证表单元素可见
    await expect(calculatorPage.functionalForm.deviceCountInput).toBeVisible();
  });

  test('场景加载失败时显示空状态', async ({ page }) => {
    // 拦截 API 请求使其失败
    await page.route('**/api/scenarios/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '服务器错误' }),
      });
    });

    // 刷新页面
    await page.reload();

    // 等待加载完成
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 应该仍然显示自定义配置选项
    await calculatorPage.scenarioSelector.expectCustomConfigVisible();
  });

  test('场景加载中显示 loading 状态', async ({ page }) => {
    // 延迟 API 响应
    await page.route('**/api/scenarios/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    // 刷新页面触发加载
    await page.reload();

    // 验证 loading 状态
    const spinner = page.locator('.ant-spin');
    await expect(spinner).toBeVisible();
    const loadingText = page.getByText('正在加载预设场景');
    await expect(loadingText).toBeVisible();
  });
});
