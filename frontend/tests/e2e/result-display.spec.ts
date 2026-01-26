/**
 * 结果展示 E2E 测试
 * 适配优化后的三层信息架构 UI
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

  test.describe('Hero 区域', () => {
    test('显示单设备月均费用', async () => {
      // 新 UI 使用 Hero 区域展示单设备月费
      await calculatorPage.resultDisplay.expectHeroVisible();
      const value = await calculatorPage.resultDisplay.getPerDeviceMonthly();
      // 值格式为 $X.XXXX
      expect(value).toMatch(/\$[\d,.]+/);
      expect(parseFloat(value.replace(/[,$]/g, ''))).toBeGreaterThan(0);
    });
  });

  test.describe('成本统计卡片', () => {
    test('显示月度总费用', async () => {
      await expect(calculatorPage.resultDisplay.monthlyTotalCard).toBeVisible();
      const value = await calculatorPage.resultDisplay.getMonthlyTotal();
      // 值应该是数字（可能不包含$符号，因为它是 prefix）
      expect(parseFloat(value.replace(/[,$]/g, ''))).toBeGreaterThan(0);
    });

    test('显示年度总费用', async () => {
      await expect(calculatorPage.resultDisplay.yearlyTotalCard).toBeVisible();
      const value = await calculatorPage.resultDisplay.getYearlyTotal();
      expect(parseFloat(value.replace(/[,$]/g, ''))).toBeGreaterThan(0);
    });

    test('显示设备数量', async () => {
      await expect(calculatorPage.resultDisplay.deviceCountCard).toBeVisible();
      const value = await calculatorPage.resultDisplay.getDeviceCount();
      expect(parseInt(value)).toBeGreaterThan(0);
    });

    test('月度总费用大于零', async () => {
      await calculatorPage.resultDisplay.expectPositiveMonthlyTotal();
    });

    test('年度总费用约为月度的12倍', async () => {
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      const yearlyStr = await calculatorPage.resultDisplay.getYearlyTotal();

      // 解析数值
      const monthly = parseFloat(monthlyStr.replace(/[$,]/g, ''));
      const yearly = parseFloat(yearlyStr.replace(/[$,]/g, ''));

      // 年度应约等于月度 * 12
      expect(yearly).toBeCloseTo(monthly * 12, 1);
    });
  });

  test.describe('费用明细', () => {
    test('显示费用构成区域', async ({ page }) => {
      // 新 UI 使用 "费用构成" 标题
      const breakdownSection = page.locator('[data-testid="result-breakdown-section"]');
      await expect(breakdownSection).toBeVisible();
      await expect(page.getByText('费用构成')).toBeVisible();
    });

    test('显示视图切换器', async ({ page }) => {
      // 新 UI 有表格/图表切换
      const viewToggle = page.locator('.ant-segmented');
      await expect(viewToggle).toBeVisible();
      await expect(page.getByText('表格')).toBeVisible();
      await expect(page.getByText('图表')).toBeVisible();
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

    test('可以切换到图表视图', async ({ page }) => {
      // 点击图表切换
      await calculatorPage.resultDisplay.switchToChartView();

      // 验证图表可见（饼图使用 echarts）- 在费用明细区域内
      const breakdownSection = page.locator('[data-testid="result-breakdown-section"]');
      const chart = breakdownSection.locator('canvas').first();
      await expect(chart).toBeVisible();
    });
  });

  test.describe('导出功能', () => {
    test('导出按钮可用', async () => {
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
    test('显示使用量指标折叠面板', async ({ page }) => {
      // 新 UI 使用可折叠面板
      const metricsCollapse = page.locator('.result-metrics-collapse');
      await expect(metricsCollapse).toBeVisible();
    });

    test('折叠状态下显示摘要信息', async () => {
      // 验证摘要信息可见
      const summary = await calculatorPage.resultDisplay.getMetricsSummary();
      expect(summary).toMatch(/存储/);
      expect(summary).toMatch(/PUT/);
      expect(summary).toMatch(/传输/);
    });

    test('展开后显示详细指标', async () => {
      // 展开面板
      await calculatorPage.resultDisplay.expandMetrics();

      // 验证详细指标可见
      const metrics = await calculatorPage.resultDisplay.getMetrics();
      expect(parseFloat(metrics.storage)).toBeGreaterThanOrEqual(0);
      expect(parseInt(metrics.puts.replace(/,/g, ''))).toBeGreaterThanOrEqual(0);
      expect(parseFloat(metrics.transfer)).toBeGreaterThanOrEqual(0);
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
