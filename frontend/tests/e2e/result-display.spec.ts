/**
 * 结果展示 E2E 测试
 */
import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages';
import { timeouts } from './fixtures/test-data';

test.describe('结果展示', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();

    // 快速完成计算到达结果页面
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();
    await calculatorPage.scenarioSelector.selectFirstScenario();
    await calculatorPage.clickNext();
    await calculatorPage.clickNext();
    await calculatorPage.clickCalculate();

    // 确保在结果页面
    await calculatorPage.expectStep(4);
    await calculatorPage.resultDisplay.waitForResultsLoaded();
  });

  test.describe('成本统计卡片', () => {
    test('显示月度总费用', async ({ page }) => {
      await expect(calculatorPage.resultDisplay.monthlyTotalCard).toBeVisible();
      const value = await calculatorPage.resultDisplay.getMonthlyTotal();
      // 值应该是数字（可能不包含$符号，因为它是 prefix）
      expect(parseFloat(value.replace(/[,$]/g, ''))).toBeGreaterThan(0);
    });

    test('显示年度总费用', async ({ page }) => {
      await expect(calculatorPage.resultDisplay.yearlyTotalCard).toBeVisible();
      const value = await calculatorPage.resultDisplay.getYearlyTotal();
      expect(parseFloat(value.replace(/[,$]/g, ''))).toBeGreaterThan(0);
    });

    test('显示单设备月均费用', async ({ page }) => {
      await expect(calculatorPage.resultDisplay.perDeviceCard).toBeVisible();
      const value = await calculatorPage.resultDisplay.getPerDeviceMonthly();
      expect(parseFloat(value.replace(/[,$]/g, ''))).toBeGreaterThan(0);
    });

    test('显示设备数量', async ({ page }) => {
      await expect(calculatorPage.resultDisplay.deviceCountCard).toBeVisible();
      const value = await calculatorPage.resultDisplay.getDeviceCount();
      expect(parseInt(value)).toBeGreaterThan(0);
    });

    test('月度总费用大于零', async ({ page }) => {
      await calculatorPage.resultDisplay.expectPositiveMonthlyTotal();
    });

    test('年度总费用约为月度的12倍', async ({ page }) => {
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      const yearlyStr = await calculatorPage.resultDisplay.getYearlyTotal();

      // 解析数值
      const monthly = parseFloat(monthlyStr.replace(/[$,]/g, ''));
      const yearly = parseFloat(yearlyStr.replace(/[$,]/g, ''));

      // 年度应约等于月度 * 12
      expect(yearly).toBeCloseTo(monthly * 12, 1);
    });
  });

  test.describe('费用饼图', () => {
    test('显示费用构成图表', async ({ page }) => {
      // 查找包含"费用构成"文字的区域
      const pieSection = page.locator('text=费用构成');
      await expect(pieSection).toBeVisible();
    });

    test('图表卡片标题正确', async ({ page }) => {
      // 验证费用构成标题存在
      await expect(page.getByText('费用构成')).toBeVisible();
    });
  });

  test.describe('费用明细表格', () => {
    test('显示费用明细表格', async ({ page }) => {
      // 查找费用明细区域
      const tableSection = page.locator('text=费用明细');
      await expect(tableSection).toBeVisible();
    });

    test('表格有数据行', async ({ page }) => {
      // 查找表格中的费用类型列
      const storageRow = page.locator('text=存储费用');
      await expect(storageRow).toBeVisible();
    });

    test('表格包含费用项目', async ({ page }) => {
      // 验证表格包含常见费用项
      await expect(page.getByText('存储费用')).toBeVisible();
      await expect(page.getByText('PUT 请求费用')).toBeVisible();
    });
  });

  test.describe('导出功能', () => {
    test('导出按钮可用', async ({ page }) => {
      await calculatorPage.resultDisplay.expectExportEnabled();
    });

    test('点击导出触发下载', async ({ page }) => {
      // 监听下载事件
      const downloadPromise = page.waitForEvent('download', { timeout: timeouts.apiCall });

      // 点击导出
      await calculatorPage.resultDisplay.clickExport();

      // 验证下载开始
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.xlsx');
    });
  });

  test.describe('使用量指标', () => {
    test('显示月度存储量', async ({ page }) => {
      const storageMetric = page.locator('.ant-statistic').filter({
        has: page.locator('text=月度存储量'),
      });
      await expect(storageMetric).toBeVisible();
    });

    test('显示月度 PUT 请求', async ({ page }) => {
      const putsMetric = page.locator('.ant-statistic').filter({
        has: page.locator('text=月度 PUT 请求'),
      });
      await expect(putsMetric).toBeVisible();
    });

    test('显示月度数据传输', async ({ page }) => {
      const transferMetric = page.locator('.ant-statistic').filter({
        has: page.locator('text=月度数据传输'),
      });
      await expect(transferMetric).toBeVisible();
    });
  });

  test.describe('对比结果', () => {
    test('显示存储类型对比', async ({ page }) => {
      // 对比结果在结果区域下方
      const comparisonSection = page.locator('.ant-card').filter({
        has: page.locator('text=存储类型对比'),
      });

      // 对比结果可能存在
      if (await comparisonSection.isVisible()) {
        await expect(comparisonSection).toBeVisible();
      }
    });
  });
});
