/**
 * 结果展示组件 Page Object
 */
import { Page, Locator, expect } from '@playwright/test';

export class ResultDisplay {
  readonly page: Page;

  // 标题
  readonly title: Locator;

  // 统计卡片
  readonly monthlyTotalCard: Locator;
  readonly yearlyTotalCard: Locator;
  readonly perDeviceCard: Locator;
  readonly deviceCountCard: Locator;

  // 导出按钮
  readonly exportButton: Locator;

  // 饼图区域
  readonly pieChart: Locator;

  // 费用明细表格
  readonly breakdownTable: Locator;

  // 使用量指标区域
  readonly metricsSection: Locator;

  constructor(page: Page) {
    this.page = page;

    // 标题
    this.title = page.getByRole('heading', { name: /成本计算结果/i });

    // 统计卡片（通过标题文字定位）
    this.monthlyTotalCard = page.locator('.ant-statistic').filter({
      has: page.locator('text=月度总费用'),
    });
    this.yearlyTotalCard = page.locator('.ant-statistic').filter({
      has: page.locator('text=年度总费用'),
    });
    this.perDeviceCard = page.locator('.ant-statistic').filter({
      has: page.locator('text=单设备月均费用'),
    });
    this.deviceCountCard = page.locator('.ant-statistic').filter({
      has: page.locator('text=设备数量'),
    });

    // 导出按钮
    this.exportButton = page.getByRole('button', { name: /导出 Excel/i });

    // 饼图区域（费用构成卡片）
    this.pieChart = page.locator('.ant-card').filter({
      has: page.locator('text=费用构成'),
    });

    // 费用明细表格
    this.breakdownTable = page.locator('.ant-table');

    // 使用量指标区域
    this.metricsSection = page.locator('.ant-statistic').filter({
      has: page.locator('text=月度存储量'),
    });
  }

  /**
   * 等待结果加载完成
   */
  async waitForResultsLoaded(): Promise<void> {
    await this.title.waitFor({ state: 'visible' });
    await this.monthlyTotalCard.waitFor({ state: 'visible' });
  }

  /**
   * 获取月度总费用
   */
  async getMonthlyTotal(): Promise<string> {
    const value = this.monthlyTotalCard.locator('.ant-statistic-content-value');
    return await value.textContent() || '';
  }

  /**
   * 获取年度总费用
   */
  async getYearlyTotal(): Promise<string> {
    const value = this.yearlyTotalCard.locator('.ant-statistic-content-value');
    return await value.textContent() || '';
  }

  /**
   * 获取单设备月均费用
   */
  async getPerDeviceMonthly(): Promise<string> {
    const value = this.perDeviceCard.locator('.ant-statistic-content-value');
    return await value.textContent() || '';
  }

  /**
   * 获取设备数量
   */
  async getDeviceCount(): Promise<string> {
    const value = this.deviceCountCard.locator('.ant-statistic-content-value');
    return await value.textContent() || '';
  }

  /**
   * 点击导出 Excel
   */
  async clickExport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * 验证结果区域显示
   */
  async expectResultsVisible(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.monthlyTotalCard).toBeVisible();
    await expect(this.yearlyTotalCard).toBeVisible();
  }

  /**
   * 验证饼图显示
   */
  async expectPieChartVisible(): Promise<void> {
    await expect(this.pieChart).toBeVisible();
  }

  /**
   * 验证费用明细表格显示
   */
  async expectBreakdownTableVisible(): Promise<void> {
    await expect(this.breakdownTable).toBeVisible();
  }

  /**
   * 验证导出按钮可用
   */
  async expectExportEnabled(): Promise<void> {
    await expect(this.exportButton).toBeEnabled();
  }

  /**
   * 验证月度总费用大于零
   */
  async expectPositiveMonthlyTotal(): Promise<void> {
    const value = await this.getMonthlyTotal();
    // 去掉 $ 符号和逗号
    const numericValue = parseFloat(value.replace(/[$,]/g, ''));
    expect(numericValue).toBeGreaterThan(0);
  }

  /**
   * 获取费用明细表格行数
   */
  async getBreakdownRowCount(): Promise<number> {
    const rows = this.breakdownTable.locator('tbody tr');
    return await rows.count();
  }
}
