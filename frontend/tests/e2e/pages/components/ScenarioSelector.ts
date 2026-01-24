/**
 * 场景选择器组件 Page Object
 * 适配优化后的 UI 结构
 */
import { Page, Locator, expect } from '@playwright/test';

export class ScenarioSelector {
  readonly page: Page;

  // 场景卡片
  readonly scenarioCards: Locator;
  readonly customConfigCard: Locator;

  // 加载状态
  readonly loadingSpinner: Locator;

  // 空状态
  readonly emptyState: Locator;

  // 分类区块
  readonly categoryGroups: Locator;

  constructor(page: Page) {
    this.page = page;

    // 场景卡片（使用 data-testid 选择器，排除自定义配置卡片）
    this.scenarioCards = page.locator('[data-testid^="scenario-card-"]');

    // 自定义配置卡片 - 使用 data-testid
    this.customConfigCard = page.locator('[data-testid="scenario-custom-card"]');

    // 加载状态
    this.loadingSpinner = page.locator('.ant-spin');

    // 空状态
    this.emptyState = page.locator('.ant-empty');

    // 分类区块
    this.categoryGroups = page.locator('.scenario-category-group');
  }

  /**
   * 等待场景加载完成
   */
  async waitForScenariosLoaded(): Promise<void> {
    // 等待页面网络空闲
    await this.page.waitForLoadState('networkidle');
    // 等待自定义配置卡片出现（必定存在）
    await this.customConfigCard.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 获取场景卡片数量
   */
  async getScenarioCount(): Promise<number> {
    await this.waitForScenariosLoaded();
    return await this.scenarioCards.count();
  }

  /**
   * 选择指定名称的场景
   */
  async selectScenario(scenarioName: string): Promise<void> {
    await this.waitForScenariosLoaded();
    // 通过卡片标题文本定位
    const card = this.page.locator('.scenario-card').filter({
      has: this.page.locator(`.scenario-card-title:has-text("${scenarioName}")`),
    });
    await card.click();
  }

  /**
   * 选择第一个场景
   */
  async selectFirstScenario(): Promise<void> {
    await this.waitForScenariosLoaded();
    const firstCard = this.scenarioCards.first();
    await firstCard.click();
  }

  /**
   * 点击自定义配置
   */
  async clickCustom(): Promise<void> {
    await this.waitForScenariosLoaded();
    await this.customConfigCard.click();
  }

  /**
   * 验证场景已加载
   */
  async expectScenariosLoaded(): Promise<void> {
    await this.waitForScenariosLoaded();
    const count = await this.getScenarioCount();
    expect(count).toBeGreaterThan(0);
  }

  /**
   * 验证自定义配置卡片可见
   */
  async expectCustomConfigVisible(): Promise<void> {
    await expect(this.customConfigCard).toBeVisible();
  }

  /**
   * 获取场景卡片上的信息
   * 新版本使用简洁文字展示，返回两行信息
   */
  async getScenarioInfo(scenarioName: string): Promise<{ line1: string; line2: string }> {
    const card = this.page.locator('.scenario-card').filter({
      has: this.page.locator(`.scenario-card-title:has-text("${scenarioName}")`),
    });
    const infoRows = card.locator('.scenario-card-info-row');

    return {
      line1: (await infoRows.nth(0).textContent()) || '',
      line2: (await infoRows.nth(1).textContent()) || '',
    };
  }

  /**
   * 获取分类区块数量
   */
  async getCategoryCount(): Promise<number> {
    await this.waitForScenariosLoaded();
    return await this.categoryGroups.count();
  }

  /**
   * 获取指定分类下的场景数量
   */
  async getScenariosInCategory(categoryName: string): Promise<number> {
    const categoryGroup = this.categoryGroups.filter({
      has: this.page.locator(`.scenario-category-title:has-text("${categoryName}")`),
    });
    const cards = categoryGroup.locator('.scenario-card');
    return await cards.count();
  }
}
