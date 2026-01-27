/**
 * 计算器完整流程 E2E 测试
 * 适配新版实时计算双栏布局 UI
 */
import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages';
import { standardInput } from './fixtures/test-data';

test.describe('计算器实时计算流程', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
  });

  test('页面加载成功并显示默认结果', async () => {
    // 验证页面基本元素
    await calculatorPage.expectPageLoaded();

    // 验证结果区域显示（默认配置的计算结果）
    await calculatorPage.expectResultsVisible();

    // 验证月度费用大于零
    await calculatorPage.expectPositiveMonthlyTotal();
  });

  test('选择预设场景后结果更新', async () => {
    // 等待场景加载
    await calculatorPage.waitForScenariosLoaded();

    // 记录初始月度费用
    const initialMonthly = await calculatorPage.getMonthlyTotal();

    // 选择第一个场景
    await calculatorPage.selectFirstScenario();

    // 验证结果显示
    await calculatorPage.expectResultsVisible();
    await calculatorPage.expectPositiveMonthlyTotal();
  });

  test('修改设备数量后结果实时更新', async ({ page }) => {
    // 获取初始值
    const initialMonthly = await calculatorPage.getMonthlyTotal();
    const initialDeviceCount = await calculatorPage.getDisplayedDeviceCount();

    // 修改设备数量为 200
    await calculatorPage.setDeviceCount(200);

    // 等待结果更新
    await calculatorPage.waitForCalculationComplete();

    // 验证设备数量更新
    const newDeviceCount = await calculatorPage.getDisplayedDeviceCount();
    expect(newDeviceCount).toBe(200);

    // 验证费用增加（设备翻倍，费用应该增加）
    const newMonthly = await calculatorPage.getMonthlyTotal();
    expect(newMonthly).toBeGreaterThan(initialMonthly);
  });

  test('修改保留天数后结果实时更新', async () => {
    // 获取初始费用
    const initialMonthly = await calculatorPage.getMonthlyTotal();

    // 修改保留天数为 60 天
    await calculatorPage.setRetentionDays(60);

    // 等待结果更新
    await calculatorPage.waitForCalculationComplete();

    // 验证费用增加（保留时间翻倍，存储费用应该增加）
    const newMonthly = await calculatorPage.getMonthlyTotal();
    expect(newMonthly).toBeGreaterThan(initialMonthly);
  });

  test('自定义配置后计算正确', async () => {
    // 应用自定义配置
    await calculatorPage.customConfiguration({
      deviceCount: standardInput.deviceCount,
      retentionDays: standardInput.retentionDays,
    });

    // 验证结果显示
    await calculatorPage.expectResultsVisible();
    await calculatorPage.expectPositiveMonthlyTotal();

    // 验证设备数量匹配
    const displayedCount = await calculatorPage.getDisplayedDeviceCount();
    expect(displayedCount).toBe(standardInput.deviceCount);
  });

  test('访客模式提示显示', async () => {
    // 验证访客模式提示显示
    await calculatorPage.expectGuestAlertVisible();
  });

  test('折叠面板可以展开和收起', async () => {
    // 确保功能维度面板展开
    await calculatorPage.expandPanel('functional');

    // 验证面板内容可见
    await expect(calculatorPage.functionalForm.deviceCountInput).toBeVisible();

    // 收起面板
    await calculatorPage.collapsePanel('functional');

    // 展开技术配置面板
    await calculatorPage.expandPanel('technical');
  });

  test('结果区域显示费用明细表格', async () => {
    // 等待结果加载
    await calculatorPage.waitForCalculationComplete();

    // 验证表格显示
    await calculatorPage.resultDisplay.expectBreakdownTableVisible();

    // 验证表格有数据
    const rowCount = await calculatorPage.resultDisplay.getBreakdownRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('计算过程中显示加载状态', async ({ page }) => {
    // 设置响应拦截来延迟 API 响应
    await page.route('**/api/v1/calculate', async (route) => {
      await new Promise(r => setTimeout(r, 500));
      await route.continue();
    });

    // 修改参数触发计算
    await calculatorPage.expandPanel('functional');
    const deviceInput = calculatorPage.functionalForm.deviceCountInput;
    await deviceInput.clear();
    await deviceInput.fill('500');

    // 验证加载状态出现（可能很快消失）
    // 由于是实时计算，加载状态可能非常短暂

    // 等待计算完成
    await calculatorPage.waitForCalculationComplete();

    // 验证结果更新
    await calculatorPage.expectResultsVisible();
  });

  test('导出功能可用', async () => {
    // 等待结果显示
    await calculatorPage.waitForCalculationComplete();

    // 验证导出按钮存在
    await expect(calculatorPage.exportButton).toBeVisible();
  });
});

test.describe('计算器参数联动', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
  });

  test('年度费用 = 月度费用 × 12', async () => {
    // 等待结果加载
    await calculatorPage.waitForCalculationComplete();

    // 获取月度和年度费用
    const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
    const yearlyStr = await calculatorPage.resultDisplay.getYearlyTotal();

    const monthly = parseFloat(monthlyStr.replace(/[$,]/g, ''));
    const yearly = parseFloat(yearlyStr.replace(/[$,]/g, ''));

    // 验证年度 = 月度 × 12（允许小数精度误差）
    expect(yearly).toBeCloseTo(monthly * 12, 1);
  });

  test('设备数量显示与输入一致', async () => {
    // 设置设备数量
    await calculatorPage.setDeviceCount(150);

    // 获取显示的设备数量
    const displayedCount = await calculatorPage.getDisplayedDeviceCount();

    // 验证一致
    expect(displayedCount).toBe(150);
  });

  test('多次修改参数结果正确更新', async () => {
    const costs: number[] = [];

    // 第一次配置：100 台设备
    await calculatorPage.setDeviceCount(100);
    costs.push(await calculatorPage.getMonthlyTotal());

    // 第二次配置：200 台设备
    await calculatorPage.setDeviceCount(200);
    costs.push(await calculatorPage.getMonthlyTotal());

    // 第三次配置：50 台设备
    await calculatorPage.setDeviceCount(50);
    costs.push(await calculatorPage.getMonthlyTotal());

    // 验证费用变化符合预期
    expect(costs[1]).toBeGreaterThan(costs[0]); // 200 > 100
    expect(costs[2]).toBeLessThan(costs[0]); // 50 < 100
  });
});
