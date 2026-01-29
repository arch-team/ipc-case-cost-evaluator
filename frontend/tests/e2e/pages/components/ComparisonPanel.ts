/**
 * 方案对比面板 Page Object
 */
import { Page, Locator, expect } from '@playwright/test';

export interface ComparisonRowData {
  schemeName: string;
  monthlyTotal: number;
  yearlyTotal: number;
  perDeviceCost: number;
  savingsPercent: string;
  isRecommended: boolean;
  isBaseline: boolean;
}

export class ComparisonPanel {
  readonly page: Page;

  // 面板容器
  readonly container: Locator;
  readonly title: Locator;

  // 视图切换
  readonly viewToggle: Locator;
  readonly tableView: Locator;
  readonly chartView: Locator;

  // 表格
  readonly comparisonTable: Locator;

  // 图表
  readonly chartContainer: Locator;
  readonly chartModeToggle: Locator;

  // 推荐理由
  readonly recommendationAlert: Locator;

  constructor(page: Page) {
    this.page = page;

    // 面板容器
    this.container = page.locator('.comparison-panel');
    this.title = this.container.locator('h5').filter({ hasText: '方案对比' });

    // 视图切换
    this.viewToggle = this.container.locator('.ant-segmented').first();
    this.tableView = this.viewToggle.locator('[data-value="table"], :has-text("表格")');
    this.chartView = this.viewToggle.locator('[data-value="chart"], :has-text("图表")');

    // 表格
    this.comparisonTable = this.container.locator('.ant-table').first();

    // 图表
    this.chartContainer = this.container.locator('.g2-bindbindbindbindbindbindbindclass, canvas').first();
    this.chartModeToggle = this.container.locator('.ant-segmented').last();

    // 推荐理由
    this.recommendationAlert = this.container.locator('.ant-alert-success');
  }

  /**
   * 等待面板加载
   */
  async waitForPanelLoaded(): Promise<void> {
    await this.container.waitFor({ state: 'visible' });
    await this.title.waitFor({ state: 'visible' });
  }

  /**
   * 切换到表格视图
   */
  async switchToTableView(): Promise<void> {
    await this.viewToggle.locator('text=表格').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * 切换到图表视图
   */
  async switchToChartView(): Promise<void> {
    await this.viewToggle.locator('text=图表').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * 获取表格中的方案数量
   */
  async getSchemeCount(): Promise<number> {
    // 通过表头中的方案列计算
    const headers = this.comparisonTable.locator('thead th');
    const count = await headers.count();
    // 减去费用项目列和计费模型列
    return Math.max(0, Math.floor((count - 3) / 2));
  }

  /**
   * 验证基准方案标记
   */
  async expectBaselineScheme(): Promise<void> {
    const baselineTag = this.comparisonTable.locator('thead').locator('.ant-tag-blue').filter({
      hasText: '基准线',
    });
    await expect(baselineTag).toBeVisible();
  }

  /**
   * 验证推荐方案标记
   */
  async expectRecommendedScheme(): Promise<void> {
    const recommendedTag = this.comparisonTable.locator('thead').locator('.ant-tag-green').filter({
      hasText: '推荐',
    });
    await expect(recommendedTag).toBeVisible();
  }

  /**
   * 获取推荐理由文本
   */
  async getRecommendationReason(): Promise<string> {
    if (!(await this.recommendationAlert.isVisible())) {
      return '';
    }
    const message = this.recommendationAlert.locator('.ant-alert-message');
    return (await message.textContent()) || '';
  }

  /**
   * 获取优化建议
   */
  async getSuggestions(): Promise<string[]> {
    if (!(await this.recommendationAlert.isVisible())) {
      return [];
    }
    const items = this.recommendationAlert.locator('.ant-alert-description li');
    const count = await items.count();
    const suggestions: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) suggestions.push(text.trim());
    }
    return suggestions;
  }

  /**
   * 验证推荐理由中的百分比数字加粗显示
   */
  async expectBoldPercentInReason(): Promise<void> {
    const boldText = this.recommendationAlert.locator('.ant-alert-message strong');
    await expect(boldText).toBeVisible();
  }

  /**
   * 切换图表模式（总成本/费用构成）
   */
  async switchChartMode(mode: 'total' | 'breakdown'): Promise<void> {
    await this.switchToChartView();
    const modeText = mode === 'total' ? '总成本' : '费用构成';
    await this.chartModeToggle.locator(`text=${modeText}`).click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 验证面板可见
   */
  async expectPanelVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
    await expect(this.title).toBeVisible();
  }

  /**
   * 验证表格可见
   */
  async expectTableVisible(): Promise<void> {
    await expect(this.comparisonTable).toBeVisible();
  }

  /**
   * 获取表格行数
   */
  async getTableRowCount(): Promise<number> {
    const rows = this.comparisonTable.locator('tbody tr');
    return await rows.count();
  }
}
