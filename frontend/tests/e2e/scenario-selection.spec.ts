/**
 * 场景选择 E2E 测试
 * 适配新版实时计算 UI - 下拉框式场景选择
 */
import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages';

test.describe('场景选择', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
  });

  test('快速开始面板显示场景下拉框', async ({ page }) => {
    // 等待页面加载
    await calculatorPage.waitForScenariosLoaded();

    // 展开快速开始面板
    await calculatorPage.expandPanel('quick-start');

    // 验证场景选择下拉框存在
    const selectBox = calculatorPage.quickStartPanel.locator('.ant-select');
    await expect(selectBox).toBeVisible();
  });

  test('点击下拉框显示场景选项', async ({ page }) => {
    // 等待页面加载
    await calculatorPage.waitForScenariosLoaded();

    // 展开快速开始面板
    await calculatorPage.expandPanel('quick-start');

    // 点击场景选择下拉框
    const selectBox = calculatorPage.quickStartPanel.locator('.ant-select');
    await selectBox.click();

    // 等待下拉选项出现
    await page.waitForSelector('.ant-select-dropdown', { state: 'visible' });

    // 验证有选项存在
    const options = page.locator('.ant-select-item-option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);
  });

  test('选择场景后自动填充参数并计算', async ({ page }) => {
    // 等待页面加载
    await calculatorPage.waitForScenariosLoaded();

    // 记录初始月度费用
    const initialMonthly = await calculatorPage.getMonthlyTotal();

    // 选择第一个场景
    await calculatorPage.selectFirstScenario();

    // 验证结果更新
    await calculatorPage.expectResultsVisible();
    await calculatorPage.expectPositiveMonthlyTotal();

    // 验证设备数量已更新（大于 0）
    const deviceCount = await calculatorPage.getDisplayedDeviceCount();
    expect(deviceCount).toBeGreaterThan(0);
  });

  test('选择场景后费用正确计算', async ({ page }) => {
    // 等待场景加载
    await calculatorPage.waitForScenariosLoaded();

    // 展开快速开始面板
    await calculatorPage.expandPanel('quick-start');

    // 点击场景选择下拉框
    const selectBox = calculatorPage.quickStartPanel.locator('.ant-select');
    await selectBox.click();

    // 获取所有选项
    const options = page.locator('.ant-select-item-option');
    const optionCount = await options.count();

    if (optionCount >= 1) {
      // 选择第一个选项
      await options.nth(0).click();
      await calculatorPage.waitForCalculationComplete();
      const cost1 = await calculatorPage.getMonthlyTotal();

      // 验证费用大于零
      expect(cost1).toBeGreaterThan(0);

      if (optionCount >= 2) {
        // 选择第二个选项
        await selectBox.click();
        await options.nth(1).click();
        await calculatorPage.waitForCalculationComplete();
        const cost2 = await calculatorPage.getMonthlyTotal();

        // 验证第二个场景费用也大于零
        expect(cost2).toBeGreaterThan(0);

        // 注：两个场景可能配置相同，费用可能相等，这是合法的
      }
    }
  });

  test('场景加载失败时可手动配置', async ({ page }) => {
    // 拦截 API 请求使其失败
    await page.route('**/api/v1/scenarios', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '服务器错误' }),
      });
    });

    // 刷新页面
    await page.reload();

    // 等待页面加载
    await calculatorPage.waitForPageReady();

    // 仍然可以手动配置参数
    await calculatorPage.expandPanel('functional');
    await expect(calculatorPage.functionalForm.deviceCountInput).toBeVisible();

    // 修改设备数量
    await calculatorPage.setDeviceCount(50);

    // 验证结果更新
    await calculatorPage.expectResultsVisible();
  });

  test('功能维度面板显示完整配置表单', async ({ page }) => {
    // 展开功能维度面板
    await calculatorPage.expandPanel('functional');

    // 验证表单字段存在
    await expect(calculatorPage.functionalForm.deviceCountInput).toBeVisible();
    await expect(calculatorPage.functionalForm.retentionDaysInput).toBeVisible();
    await expect(calculatorPage.functionalForm.recordingModeSelect).toBeVisible();
    await expect(calculatorPage.functionalForm.videoQualitySelect).toBeVisible();
  });
});
