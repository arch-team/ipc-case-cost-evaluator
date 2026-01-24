/**
 * 首页 Page Object
 */
import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  // 导航链接
  readonly calculatorLink: Locator;
  readonly evaluationsLink: Locator;
  readonly settingsLink: Locator;

  // 侧边栏
  readonly sider: Locator;

  constructor(page: Page) {
    this.page = page;

    // 侧边栏菜单项
    this.sider = page.locator('.ant-layout-sider');
    this.calculatorLink = page.getByRole('menuitem', { name: /成本计算/i });
    this.evaluationsLink = page.getByRole('menuitem', { name: /评估管理/i });
    this.settingsLink = page.getByRole('menuitem', { name: /设置/i });
  }

  /**
   * 导航到首页
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageReady();
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageReady(): Promise<void> {
    await this.sider.waitFor({ state: 'visible' });
  }

  /**
   * 点击成本计算导航
   */
  async navigateToCalculator(): Promise<void> {
    await this.calculatorLink.click();
    await this.page.waitForURL('**/calculator');
  }

  /**
   * 点击评估管理导航
   */
  async navigateToEvaluations(): Promise<void> {
    await this.evaluationsLink.click();
    await this.page.waitForURL('**/evaluations');
  }

  /**
   * 点击设置导航
   */
  async navigateToSettings(): Promise<void> {
    await this.settingsLink.click();
    await this.page.waitForURL('**/settings');
  }
}
