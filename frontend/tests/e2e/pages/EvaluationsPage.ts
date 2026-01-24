/**
 * 评估管理页面 Page Object
 */
import { Page, Locator, expect } from '@playwright/test';

export class EvaluationsPage {
  readonly page: Page;

  // 页面标题
  readonly pageTitle: Locator;

  // 评估列表
  readonly evaluationList: Locator;
  readonly evaluationItems: Locator;

  // 空状态
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageTitle = page.getByRole('heading', { name: /评估管理/i });
    this.evaluationList = page.locator('.ant-list');
    this.evaluationItems = page.locator('.ant-list-item');
    this.emptyState = page.locator('.ant-empty');
  }

  /**
   * 导航到评估管理页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/evaluations');
    await this.waitForPageReady();
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageReady(): Promise<void> {
    // 等待页面标题或空状态出现
    await this.page.waitForSelector('.ant-card, .ant-empty');
  }

  /**
   * 获取评估项数量
   */
  async getEvaluationCount(): Promise<number> {
    return await this.evaluationItems.count();
  }

  /**
   * 验证页面是否为空
   */
  async expectEmpty(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * 验证页面有评估项
   */
  async expectHasEvaluations(): Promise<void> {
    const count = await this.getEvaluationCount();
    expect(count).toBeGreaterThan(0);
  }
}
