/**
 * 计算器完整流程 E2E 测试
 */
import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages';
import { standardInput } from './fixtures/test-data';

test.describe('计算器完整流程', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
  });

  test('选择预设场景后完成计算', async () => {
    // 等待场景加载
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 选择第一个场景
    await calculatorPage.scenarioSelector.selectFirstScenario();

    // 验证跳转到功能配置步骤
    await calculatorPage.expectStep(1);

    // 继续到下一步（技术选项）
    await calculatorPage.clickNext();
    await calculatorPage.expectStep(2);

    // 继续到下一步（价格设置）
    await calculatorPage.clickNext();
    await calculatorPage.expectStep(3);

    // 点击开始计算
    await calculatorPage.clickCalculate();

    // 验证跳转到结果页面
    await calculatorPage.expectStep(4);

    // 验证结果显示
    await calculatorPage.resultDisplay.expectResultsVisible();
    await calculatorPage.resultDisplay.expectPositiveMonthlyTotal();
  });

  test('自定义配置后完成计算', async () => {
    // 等待场景加载
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();

    // 点击自定义配置
    await calculatorPage.scenarioSelector.clickCustom();

    // 验证跳转到功能配置步骤
    await calculatorPage.expectStep(1);

    // 修改设备数量
    await calculatorPage.functionalForm.setDeviceCount(standardInput.deviceCount);

    // 设置保留天数
    await calculatorPage.functionalForm.setRetentionDays(standardInput.retentionDays);

    // 继续到技术选项
    await calculatorPage.clickNext();
    await calculatorPage.expectStep(2);

    // 继续到价格设置
    await calculatorPage.clickNext();
    await calculatorPage.expectStep(3);

    // 点击开始计算
    await calculatorPage.clickCalculate();

    // 验证结果显示
    await calculatorPage.expectStep(4);
    await calculatorPage.resultDisplay.expectResultsVisible();
  });

  test('重新计算功能', async () => {
    // 快速完成一次计算
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();
    await calculatorPage.scenarioSelector.selectFirstScenario();
    await calculatorPage.clickNext();
    await calculatorPage.clickNext();
    await calculatorPage.clickCalculate();

    // 验证在结果页面
    await calculatorPage.expectStep(4);
    await calculatorPage.resultDisplay.expectResultsVisible();

    // 点击重新计算
    await calculatorPage.clickReset();

    // 验证返回到场景选择步骤
    await calculatorPage.expectStep(0);
    await calculatorPage.scenarioSelector.expectCustomConfigVisible();
  });

  test('步骤导航（上一步/下一步）', async () => {
    // 点击自定义配置进入步骤 1
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();
    await calculatorPage.scenarioSelector.clickCustom();
    await calculatorPage.expectStep(1);

    // 下一步到步骤 2
    await calculatorPage.clickNext();
    await calculatorPage.expectStep(2);

    // 下一步到步骤 3
    await calculatorPage.clickNext();
    await calculatorPage.expectStep(3);

    // 上一步返回步骤 2
    await calculatorPage.clickPrev();
    await calculatorPage.expectStep(2);

    // 上一步返回步骤 1
    await calculatorPage.clickPrev();
    await calculatorPage.expectStep(1);
  });

  test('计算过程中显示加载状态', async ({ page }) => {
    // 快速到达计算步骤
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();
    await calculatorPage.scenarioSelector.selectFirstScenario();
    await calculatorPage.clickNext();
    await calculatorPage.clickNext();

    // 设置响应拦截来延迟 API 响应，以便观察加载状态
    await page.route('**/api/v1/calculate', async (route) => {
      // 等待一小段时间，让测试有机会检查加载状态
      await new Promise(r => setTimeout(r, 500));
      await route.continue();
    });

    // 点击计算按钮（不等待完成）
    const clickPromise = calculatorPage.calculateButton.click();

    // 验证按钮进入加载状态（使用 .ant-btn-loading 或检查 loading 属性）
    await expect(calculatorPage.calculateButton.locator('.ant-btn-loading-icon')).toBeVisible({ timeout: 2000 });

    // 等待点击完成和结果显示
    await clickPromise;
    await page.waitForLoadState('networkidle');

    // 验证结果显示
    await calculatorPage.resultDisplay.expectResultsVisible();
  });
});
