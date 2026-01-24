/**
 * 结果展示组件 Page Object
 * 适配优化后的三层信息架构 UI 结构
 */
import { Page, Locator, expect } from '@playwright/test';

/**
 * 费用明细行数据结构
 */
export interface BreakdownRowData {
  name: string;
  unitPrice: string;
  quantity: string;
  monthly: string;
  yearly: string;
  percent: string;
}

/**
 * 表格合计行数据
 */
export interface TableSummary {
  monthly: number;
  yearly: number;
  percentTotal: string;
}

export class ResultDisplay {
  readonly page: Page;

  // 标题
  readonly title: Locator;

  // Hero 区域 - 单设备月均费用
  readonly heroSection: Locator;
  readonly heroValue: Locator;

  // 副指标栏
  readonly secondaryStats: Locator;
  readonly monthlyTotalCard: Locator;
  readonly yearlyTotalCard: Locator;
  readonly deviceCountCard: Locator;

  // 导出按钮
  readonly exportButton: Locator;

  // 费用明细区域
  readonly breakdownSection: Locator;
  readonly viewToggle: Locator;

  // 费用明细表格
  readonly breakdownTable: Locator;

  // 使用量指标区域（可折叠）
  readonly metricsCollapse: Locator;

  constructor(page: Page) {
    this.page = page;

    // 标题
    this.title = page.getByRole('heading', { name: /成本计算结果/i });

    // Hero 区域 - 使用 data-testid
    this.heroSection = page.locator('[data-testid="result-hero"]');
    this.heroValue = this.heroSection.locator('.result-hero-value');

    // 副指标栏 - 使用 data-testid
    this.secondaryStats = page.locator('[data-testid="result-secondary-stats"]');

    // 统计卡片（通过标题文字定位）
    this.monthlyTotalCard = page.locator('.ant-statistic').filter({
      has: page.locator('text=月度总费用'),
    });
    this.yearlyTotalCard = page.locator('.ant-statistic').filter({
      has: page.locator('text=年度总费用'),
    });
    this.deviceCountCard = page.locator('.ant-statistic').filter({
      has: page.locator('text=设备数量'),
    });

    // 导出按钮
    this.exportButton = page.getByRole('button', { name: /导出 Excel/i });

    // 费用明细区域 - 使用 data-testid
    this.breakdownSection = page.locator('[data-testid="result-breakdown-section"]');
    this.viewToggle = this.breakdownSection.locator('.ant-segmented');

    // 费用明细表格
    this.breakdownTable = page.locator('.ant-table');

    // 使用量指标区域（可折叠面板）
    this.metricsCollapse = page.locator('.result-metrics-collapse');
  }

  /**
   * 等待结果加载完成
   */
  async waitForResultsLoaded(): Promise<void> {
    await this.title.waitFor({ state: 'visible' });
    await this.heroSection.waitFor({ state: 'visible' });
    await this.monthlyTotalCard.waitFor({ state: 'visible' });
  }

  /**
   * 获取单设备月均费用（Hero 区域）
   */
  async getPerDeviceMonthly(): Promise<string> {
    const value = await this.heroValue.textContent();
    return value || '';
  }

  /**
   * 获取月度总费用
   */
  async getMonthlyTotal(): Promise<string> {
    const value = this.monthlyTotalCard.locator('.ant-statistic-content-value');
    return (await value.textContent()) || '';
  }

  /**
   * 获取年度总费用
   */
  async getYearlyTotal(): Promise<string> {
    const value = this.yearlyTotalCard.locator('.ant-statistic-content-value');
    return (await value.textContent()) || '';
  }

  /**
   * 获取设备数量
   */
  async getDeviceCount(): Promise<string> {
    const value = this.deviceCountCard.locator('.ant-statistic-content-value');
    return (await value.textContent()) || '';
  }

  /**
   * 点击导出 Excel
   */
  async clickExport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * 切换到图表视图
   */
  async switchToChartView(): Promise<void> {
    await this.viewToggle.locator('text=图表').click();
  }

  /**
   * 切换到表格视图
   */
  async switchToTableView(): Promise<void> {
    await this.viewToggle.locator('text=表格').click();
  }

  /**
   * 展开使用量指标面板
   */
  async expandMetrics(): Promise<void> {
    const header = this.metricsCollapse.locator('.ant-collapse-header');
    // 检查是否已展开
    const isExpanded = await this.metricsCollapse
      .locator('.ant-collapse-item-active')
      .count();
    if (isExpanded === 0) {
      await header.click();
    }
  }

  /**
   * 收起使用量指标面板
   */
  async collapseMetrics(): Promise<void> {
    const header = this.metricsCollapse.locator('.ant-collapse-header');
    // 检查是否已展开
    const isExpanded = await this.metricsCollapse
      .locator('.ant-collapse-item-active')
      .count();
    if (isExpanded > 0) {
      await header.click();
    }
  }

  /**
   * 验证结果区域显示
   */
  async expectResultsVisible(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.heroSection).toBeVisible();
    await expect(this.monthlyTotalCard).toBeVisible();
    await expect(this.yearlyTotalCard).toBeVisible();
  }

  /**
   * 验证 Hero 区域显示
   */
  async expectHeroVisible(): Promise<void> {
    await expect(this.heroSection).toBeVisible();
    await expect(this.heroValue).toBeVisible();
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

  /**
   * 获取费用明细表格所有行数据
   * 注意：表格第一列是展开按钮列，实际数据从第二列开始
   */
  async getBreakdownItems(): Promise<BreakdownRowData[]> {
    // 只选择 tbody 中的直接数据行，排除展开的子行
    // 使用 ant-table-row-level-0 类来选择主数据行
    const rows = this.breakdownTable.locator(
      'tbody > tr.ant-table-row.ant-table-row-level-0'
    );
    const count = await rows.count();
    const items: BreakdownRowData[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cells = row.locator('> td');
      const cellCount = await cells.count();

      // 确保行有足够的单元格
      if (cellCount < 7) {
        continue;
      }

      // 获取各列文本（跳过第一列展开按钮列）
      // 列索引: 0=展开按钮, 1=费用类型, 2=单价, 3=用量, 4=月度费用, 5=年度费用, 6=占比
      const name = (await cells.nth(1).textContent()) || '';
      const unitPrice = (await cells.nth(2).textContent()) || '';
      const quantity = (await cells.nth(3).textContent()) || '';
      const monthly = (await cells.nth(4).textContent()) || '';
      const yearly = (await cells.nth(5).textContent()) || '';
      const percent = (await cells.nth(6).textContent()) || '';

      items.push({
        name: name.trim(),
        unitPrice: unitPrice.trim(),
        quantity: quantity.trim(),
        monthly: monthly.trim(),
        yearly: yearly.trim(),
        percent: percent.trim(),
      });
    }

    return items;
  }

  /**
   * 获取表格合计行数据
   */
  async getTableSummary(): Promise<TableSummary> {
    const summaryRow = this.breakdownTable.locator('.ant-table-summary tr');
    const cells = summaryRow.locator('td');

    // 合计行的月度费用在第4个cell（index=3，但由于有colSpan合并，实际是第2个）
    const monthlyText = (await cells.nth(1).textContent()) || '$0';
    const yearlyText = (await cells.nth(2).textContent()) || '$0';
    const percentText = (await cells.nth(3).textContent()) || '0%';

    return {
      monthly: parseFloat(monthlyText.replace(/[$,]/g, '')),
      yearly: parseFloat(yearlyText.replace(/[$,]/g, '')),
      percentTotal: percentText.trim(),
    };
  }

  /**
   * 获取所有占比数值
   * 通过读取表格行数据获取，确保准确性
   */
  async getPercentages(): Promise<number[]> {
    const items = await this.getBreakdownItems();
    const percentages: number[] = [];

    for (const item of items) {
      const value = parseFloat(item.percent.replace('%', ''));
      if (!isNaN(value)) {
        percentages.push(value);
      }
    }

    return percentages;
  }

  /**
   * 获取表格列数
   */
  async getTableColumnCount(): Promise<number> {
    const headers = this.breakdownTable.locator('thead th');
    return await headers.count();
  }

  /**
   * 验证货币格式（$X.XX 或 $X,XXX.XX）
   */
  verifyMonetaryFormat(value: string, decimals: number = 2): boolean {
    // 匹配 $X.XX 或 $X,XXX.XX 格式
    const pattern = new RegExp(`^\\$[\\d,]+\\.\\d{${decimals}}$`);
    return pattern.test(value);
  }

  /**
   * 验证单价格式（$X.XXXX）
   */
  verifyUnitPriceFormat(value: string): boolean {
    // 匹配 $X.XXXX/单位 格式
    const pattern = /^\$[\d.]+\/[\w\-\/]+$/;
    return pattern.test(value);
  }

  /**
   * 获取使用量指标数据
   * 需要先展开可折叠面板
   */
  async getMetrics(): Promise<{ storage: string; puts: string; transfer: string }> {
    // 先展开面板
    await this.expandMetrics();

    const storageCard = this.metricsCollapse.locator('.ant-statistic').filter({
      has: this.page.locator('text=月度存储量'),
    });
    const putsCard = this.metricsCollapse.locator('.ant-statistic').filter({
      has: this.page.locator('text=月度 PUT 请求'),
    });
    const transferCard = this.metricsCollapse.locator('.ant-statistic').filter({
      has: this.page.locator('text=月度数据传输'),
    });

    return {
      storage:
        (await storageCard
          .locator('.ant-statistic-content-value')
          .textContent()) || '',
      puts:
        (await putsCard.locator('.ant-statistic-content-value').textContent()) ||
        '',
      transfer:
        (await transferCard
          .locator('.ant-statistic-content-value')
          .textContent()) || '',
    };
  }

  /**
   * 获取使用量指标摘要（折叠状态下显示）
   */
  async getMetricsSummary(): Promise<string> {
    const summary = this.metricsCollapse.locator('.result-metrics-summary');
    return (await summary.textContent()) || '';
  }

  /**
   * 获取高占比标签（红色）
   */
  async getHighPercentTags(): Promise<Locator> {
    return this.breakdownTable.locator('tbody .ant-tag-red');
  }

  /**
   * 获取中占比标签（橙色）
   */
  async getMediumPercentTags(): Promise<Locator> {
    return this.breakdownTable.locator('tbody .ant-tag-orange');
  }

  /**
   * 解析货币字符串为数值
   */
  parseMonetary(value: string): number {
    return parseFloat(value.replace(/[$,]/g, ''));
  }
}
