/**
 * 多方案管理面板 Page Object
 */
import { Page, Locator, expect } from '@playwright/test';

export class MultiSchemePanel {
  readonly page: Page;

  // Tab 容器
  readonly tabsContainer: Locator;
  readonly addSchemeButton: Locator;

  // 方案配置区域
  readonly schemeConfig: Locator;
  readonly retentionDaysInput: Locator;
  readonly enabledSwitch: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tab 容器
    this.tabsContainer = page.locator('.multi-scheme-panel .ant-tabs');
    this.addSchemeButton = page.locator('.multi-scheme-panel .ant-tabs-nav-add');

    // 方案配置区域
    this.schemeConfig = page.locator('.scheme-config');
    this.retentionDaysInput = this.schemeConfig.locator('.ant-input-number-input').first();
    this.enabledSwitch = this.schemeConfig.locator('.ant-switch');
  }

  /**
   * 获取当前方案数量
   */
  async getSchemeCount(): Promise<number> {
    return await this.tabsContainer.locator('.ant-tabs-tab').count();
  }

  /**
   * 获取所有方案名称
   */
  async getSchemeNames(): Promise<string[]> {
    const tabs = this.tabsContainer.locator('.ant-tabs-tab');
    const count = await tabs.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await tabs.nth(i).textContent();
      names.push(text?.replace('基准', '').trim() || '');
    }
    return names;
  }

  /**
   * 获取当前活动的方案名称
   */
  async getActiveScheme(): Promise<string> {
    const activeTab = this.tabsContainer.locator('.ant-tabs-tab-active');
    const text = await activeTab.textContent();
    return text?.replace('基准', '').trim() || '';
  }

  /**
   * 添加新方案
   */
  async addScheme(): Promise<void> {
    const currentCount = await this.getSchemeCount();
    if (currentCount >= 4) {
      throw new Error('最多支持 4 个方案');
    }
    await this.addSchemeButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * 切换到指定方案
   */
  async switchToScheme(schemeName: string): Promise<void> {
    const tab = this.tabsContainer.locator('.ant-tabs-tab').filter({
      hasText: schemeName,
    });
    await tab.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * 删除指定方案
   */
  async deleteScheme(schemeName: string): Promise<void> {
    const tab = this.tabsContainer.locator('.ant-tabs-tab').filter({
      hasText: schemeName,
    });
    const closeBtn = tab.locator('.ant-tabs-tab-remove');
    await closeBtn.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * 设置当前方案的保留天数
   */
  async setRetentionDays(days: number): Promise<void> {
    await this.retentionDaysInput.clear();
    await this.retentionDaysInput.fill(days.toString());
    await this.retentionDaysInput.blur();
  }

  /**
   * 切换方案启用状态
   */
  async toggleEnabled(enabled: boolean): Promise<void> {
    const isChecked = await this.enabledSwitch.getAttribute('aria-checked') === 'true';
    if (isChecked !== enabled) {
      await this.enabledSwitch.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * 获取当前方案是否启用
   */
  async isEnabled(): Promise<boolean> {
    return await this.enabledSwitch.getAttribute('aria-checked') === 'true';
  }

  /**
   * 验证方案标签显示
   */
  async expectSchemeTag(schemeName: string, tag: '基准' | '推荐'): Promise<void> {
    const tab = this.tabsContainer.locator('.ant-tabs-tab').filter({
      hasText: schemeName,
    });
    await expect(tab.locator('.ant-tag')).toContainText(tag);
  }

  /**
   * 验证添加按钮状态
   */
  async expectAddButtonDisabled(): Promise<void> {
    // 当达到 4 个方案时，添加按钮应该被禁用或隐藏
    const count = await this.getSchemeCount();
    if (count >= 4) {
      await expect(this.addSchemeButton).toHaveAttribute('disabled');
    }
  }
}
