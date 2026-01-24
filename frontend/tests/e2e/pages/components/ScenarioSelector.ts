/**
 * 场景选择器组件 Page Object
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

  constructor(page: Page) {
    this.page = page;

    // 场景卡片（排除自定义配置卡片）
    this.scenarioCards = page.locator('.ant-card.ant-card-hoverable').filter({
      hasNot: page.locator('h5:has-text("自定义配置")'),
    });
    // 自定义配置卡片 - 精确匹配包含 h5 标题的 hoverable 卡片
    this.customConfigCard = page.locator('.ant-card.ant-card-hoverable').filter({
      has: page.locator('h5:has-text("自定义配置")'),
    });

    // 加载状态
    this.loadingSpinner = page.locator('.ant-spin');

    // 空状态
    this.emptyState = page.locator('.ant-empty');
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
    const card = this.page.locator('.ant-card.ant-card-hoverable').filter({
      has: this.page.locator(`h5:has-text("${scenarioName}")`),
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
   * 获取场景卡片上的标签信息
   */
  async getScenarioTags(scenarioName: string): Promise<string[]> {
    const card = this.page.locator('.ant-card.ant-card-hoverable').filter({
      has: this.page.locator(`h5:has-text("${scenarioName}")`),
    });
    const tags = card.locator('.ant-tag');
    const tagTexts: string[] = [];
    const count = await tags.count();
    for (let i = 0; i < count; i++) {
      const text = await tags.nth(i).textContent();
      if (text) {
        tagTexts.push(text);
      }
    }
    return tagTexts;
  }
}
