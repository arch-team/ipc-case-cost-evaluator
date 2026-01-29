/**
 * 敏感度分析面板 Page Object
 */
import { Page, Locator, expect } from '@playwright/test';

export interface SensitivityItemData {
  label: string;
  currentValue: string;
  minCost: string;
  maxCost: string;
  hasChanged: boolean;
}

export class SensitivityAnalysis {
  readonly page: Page;

  // 面板容器
  readonly container: Locator;
  readonly title: Locator;

  // 基准成本
  readonly baselineCost: Locator;

  // 敏感度项目
  readonly sensitivityItems: Locator;

  // 底部摘要
  readonly sensitivitySummary: Locator;

  constructor(page: Page) {
    this.page = page;

    // 面板容器
    this.container = page.locator('.sensitivity-analysis-v2');
    this.title = this.container.locator('.sensitivity-title');

    // 基准成本
    this.baselineCost = this.container.locator('.sensitivity-baseline-cost');

    // 敏感度项目
    this.sensitivityItems = this.container.locator('.sensitivity-row');

    // 底部摘要
    this.sensitivitySummary = this.container.locator('.sensitivity-summary');
  }

  /**
   * 等待面板加载
   */
  async waitForPanelLoaded(): Promise<void> {
    await this.container.waitFor({ state: 'visible' });
    await this.title.waitFor({ state: 'visible' });
    // 等待敏感度计算完成
    await this.page.waitForTimeout(1000);
  }

  /**
   * 获取基准成本
   */
  async getBaselineCost(): Promise<string> {
    return (await this.baselineCost.textContent()) || '';
  }

  /**
   * 获取敏感度项目数量
   */
  async getItemCount(): Promise<number> {
    return await this.sensitivityItems.count();
  }

  /**
   * 获取指定参数的滑块
   */
  getSlider(label: string): Locator {
    return this.sensitivityItems.filter({ hasText: label }).locator('.ant-slider');
  }

  /**
   * 设置参数滑块值
   */
  async setSliderValue(label: string, percentage: number): Promise<void> {
    const slider = this.getSlider(label);
    const handle = slider.locator('.ant-slider-handle');

    // 获取滑块尺寸
    const sliderBox = await slider.boundingBox();
    if (!sliderBox) return;

    // 计算目标位置
    const targetX = sliderBox.x + (sliderBox.width * percentage) / 100;
    const targetY = sliderBox.y + sliderBox.height / 2;

    // 拖动滑块
    await handle.dragTo(this.page.locator('body'), {
      targetPosition: { x: targetX - sliderBox.x, y: targetY - sliderBox.y },
    });
    await this.page.waitForTimeout(500);
  }

  /**
   * 点击滑块拖动到指定位置
   */
  async dragSlider(label: string, relativePosition: number): Promise<void> {
    const slider = this.getSlider(label);
    const sliderBox = await slider.boundingBox();
    if (!sliderBox) return;

    await slider.click({ position: { x: sliderBox.width * relativePosition, y: sliderBox.height / 2 } });
    await this.page.waitForTimeout(500);
  }

  /**
   * 检查参数是否有变化
   */
  async hasParameterChanged(label: string): Promise<boolean> {
    const item = this.sensitivityItems.filter({ hasText: label });
    const valueText = item.locator('.sensitivity-row-value');
    const classList = await valueText.getAttribute('class');
    return classList?.includes('warning') || false;
  }

  /**
   * 获取"应用"按钮
   */
  getApplyButton(label: string): Locator {
    return this.sensitivityItems.filter({ hasText: label }).locator('.sensitivity-apply-btn');
  }

  /**
   * 点击应用按钮
   */
  async clickApply(label: string): Promise<void> {
    const applyBtn = this.getApplyButton(label);
    await applyBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 验证应用按钮在参数改变时出现
   */
  async expectApplyButtonVisible(label: string): Promise<void> {
    const applyBtn = this.getApplyButton(label);
    await expect(applyBtn).toBeVisible();
  }

  /**
   * 验证应用按钮在参数未改变时隐藏
   */
  async expectApplyButtonHidden(label: string): Promise<void> {
    const applyBtn = this.getApplyButton(label);
    await expect(applyBtn).not.toBeVisible();
  }

  /**
   * 获取成本敏感度排序文本
   */
  async getSensitivityRanking(): Promise<string> {
    const text = await this.sensitivitySummary.textContent();
    return text || '';
  }

  /**
   * 验证条形图可见
   */
  async expectBarsVisible(label: string): Promise<void> {
    const item = this.sensitivityItems.filter({ hasText: label });
    const bars = item.locator('.sensitivity-bars');
    await expect(bars).toBeVisible();

    // 验证有三条条形图（最小值、当前值、最大值）
    const barRows = bars.locator('.sensitivity-bar-row');
    expect(await barRows.count()).toBe(3);
  }

  /**
   * 获取最小成本
   */
  async getMinCost(label: string): Promise<string> {
    const item = this.sensitivityItems.filter({ hasText: label });
    const minBar = item.locator('.sensitivity-bar-min').locator('..');
    const costLabel = minBar.locator('.sensitivity-bar-label');
    return (await costLabel.textContent()) || '';
  }

  /**
   * 获取最大成本
   */
  async getMaxCost(label: string): Promise<string> {
    const item = this.sensitivityItems.filter({ hasText: label });
    const maxBar = item.locator('.sensitivity-bar-max').locator('..');
    const costLabel = maxBar.locator('.sensitivity-bar-label');
    return (await costLabel.textContent()) || '';
  }

  /**
   * 验证面板可见
   */
  async expectPanelVisible(): Promise<void> {
    await expect(this.container).toBeVisible();
    await expect(this.title).toBeVisible();
  }

  /**
   * 验证所有参数项目可见
   */
  async expectAllItemsVisible(): Promise<void> {
    const expectedLabels = ['设备数量', '保留天数', '回看比例', '视频质量'];
    for (const label of expectedLabels) {
      const item = this.sensitivityItems.filter({ hasText: label });
      await expect(item).toBeVisible();
    }
  }
}
