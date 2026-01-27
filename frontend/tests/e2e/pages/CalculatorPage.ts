/**
 * 计算器页面 Page Object
 * 适配新版实时计算双栏布局 UI
 */
import { Page, Locator, expect } from '@playwright/test';
import { FunctionalForm } from './components/FunctionalForm';
import { ResultDisplay } from './components/ResultDisplay';

export class CalculatorPage {
  readonly page: Page;
  readonly functionalForm: FunctionalForm;
  readonly resultDisplay: ResultDisplay;

  // 页面标题和状态
  readonly pageTitle: Locator;
  readonly realTimeIndicator: Locator;
  readonly loadingSpinner: Locator;

  // 折叠面板
  readonly collapsePanelContainer: Locator;
  readonly quickStartPanel: Locator;
  readonly functionalPanel: Locator;
  readonly technicalPanel: Locator;
  readonly pricingPanel: Locator;

  // 快速开始区域
  readonly scenarioSelect: Locator;

  // 操作按钮
  readonly exportButton: Locator;
  readonly shareButton: Locator;
  readonly saveButton: Locator;

  // 访客模式提示
  readonly guestAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.functionalForm = new FunctionalForm(page);
    this.resultDisplay = new ResultDisplay(page);

    // 页面标题（左侧输入区）- 使用更灵活的选择器
    this.pageTitle = page.locator('text=成本计算器').first();
    this.realTimeIndicator = page.locator('text=实时计算');
    this.loadingSpinner = page.locator('.ant-spin-spinning');

    // 折叠面板定位
    this.collapsePanelContainer = page.locator('.ant-collapse').first();
    this.quickStartPanel = page.locator('.ant-collapse-item').filter({
      has: page.locator('text=快速开始'),
    });
    this.functionalPanel = page.locator('.ant-collapse-item').filter({
      has: page.locator('text=功能维度'),
    });
    this.technicalPanel = page.locator('.ant-collapse-item').filter({
      has: page.locator('text=技术维度'),
    });
    this.pricingPanel = page.locator('.ant-collapse-item').filter({
      has: page.locator('text=价格维度'),
    });

    // 快速开始 - 场景选择下拉框
    this.scenarioSelect = page.locator('.ant-select').filter({
      has: page.locator('[class*="ant-select-selection-placeholder"]'),
    }).first();

    // 操作按钮（在输入面板底部或结果区域）- 使用 first() 避免多匹配
    this.exportButton = page.getByRole('button', { name: /导出 Excel/ }).first();
    this.shareButton = page.getByRole('button', { name: /分享/ }).first();
    this.saveButton = page.getByRole('button', { name: /保存/ }).first();

    // 访客模式提示
    this.guestAlert = page.locator('.ant-alert').filter({ hasText: '访客模式' });
  }

  /**
   * 导航到计算器页面
   */
  async goto(): Promise<void> {
    await this.page.goto('/calculator');
    await this.waitForPageReady();
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageReady(): Promise<void> {
    // 等待页面标题出现
    await this.pageTitle.waitFor({ state: 'visible', timeout: 15000 });
    // 等待折叠面板出现
    await this.collapsePanelContainer.waitFor({ state: 'visible' });
  }

  /**
   * 等待计算完成（实时计算模式）
   */
  async waitForCalculationComplete(): Promise<void> {
    // 等待加载动画消失
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // 如果没有 spinner 则忽略
    });
    // 等待结果区域显示
    await this.resultDisplay.waitForResultsLoaded();
  }

  /**
   * 等待场景列表加载
   */
  async waitForScenariosLoaded(): Promise<void> {
    // 等待快速开始面板出现
    await this.quickStartPanel.waitFor({ state: 'visible' });
    // 等待场景下拉框可用
    await this.page.waitForTimeout(500); // 等待 API 加载
  }

  /**
   * 选择预设场景
   */
  async selectScenario(scenarioName: string): Promise<void> {
    // 确保快速开始面板展开
    await this.expandPanel('quick-start');

    // 点击场景选择下拉框
    const selectTrigger = this.quickStartPanel.locator('.ant-select');
    await selectTrigger.click();

    // 等待下拉选项出现并选择
    const option = this.page.locator('.ant-select-item-option').filter({
      hasText: scenarioName,
    });
    await option.click();

    // 等待计算完成
    await this.waitForCalculationComplete();
  }

  /**
   * 选择第一个预设场景
   */
  async selectFirstScenario(): Promise<void> {
    // 确保快速开始面板展开
    await this.expandPanel('quick-start');

    // 点击场景选择下拉框
    const selectTrigger = this.quickStartPanel.locator('.ant-select');
    await selectTrigger.click();

    // 选择第一个选项
    const firstOption = this.page.locator('.ant-select-item-option').first();
    await firstOption.click();

    // 等待计算完成
    await this.waitForCalculationComplete();
  }

  /**
   * 展开指定面板
   */
  async expandPanel(panelKey: 'quick-start' | 'functional' | 'technical' | 'pricing'): Promise<void> {
    const panelMap = {
      'quick-start': this.quickStartPanel,
      'functional': this.functionalPanel,
      'technical': this.technicalPanel,
      'pricing': this.pricingPanel,
    };

    const panel = panelMap[panelKey];
    const isExpanded = await panel.locator('.ant-collapse-item-active').count() > 0 ||
                       await panel.evaluate(el => el.classList.contains('ant-collapse-item-active'));

    if (!isExpanded) {
      await panel.locator('.ant-collapse-header').click();
      await this.page.waitForTimeout(300); // 等待动画
    }
  }

  /**
   * 收起指定面板
   */
  async collapsePanel(panelKey: 'quick-start' | 'functional' | 'technical' | 'pricing'): Promise<void> {
    const panelMap = {
      'quick-start': this.quickStartPanel,
      'functional': this.functionalPanel,
      'technical': this.technicalPanel,
      'pricing': this.pricingPanel,
    };

    const panel = panelMap[panelKey];
    const isExpanded = await panel.locator('.ant-collapse-item-active').count() > 0 ||
                       await panel.evaluate(el => el.classList.contains('ant-collapse-item-active'));

    if (isExpanded) {
      await panel.locator('.ant-collapse-header').click();
      await this.page.waitForTimeout(300); // 等待动画
    }
  }

  /**
   * 修改设备数量（会触发实时计算）
   */
  async setDeviceCount(count: number): Promise<void> {
    await this.expandPanel('functional');
    await this.functionalForm.setDeviceCount(count);
    // 触发 blur 事件以确保值被提交
    await this.functionalForm.deviceCountInput.blur();
    await this.page.waitForTimeout(500); // 等待防抖
    await this.waitForCalculationComplete();
  }

  /**
   * 修改保留天数（会触发实时计算）
   */
  async setRetentionDays(days: number): Promise<void> {
    await this.expandPanel('functional');
    await this.functionalForm.setRetentionDays(days);
    // 触发 blur 事件以确保值被提交
    await this.functionalForm.retentionDaysInput.blur();
    await this.page.waitForTimeout(500); // 等待防抖
    await this.waitForCalculationComplete();
  }

  /**
   * 修改录像模式（会触发实时计算）
   */
  async setRecordingMode(mode: string): Promise<void> {
    await this.expandPanel('functional');
    await this.functionalForm.selectRecordingMode(mode);
    await this.waitForCalculationComplete();
  }

  /**
   * 修改视频质量（会触发实时计算）
   */
  async setVideoQuality(quality: string): Promise<void> {
    await this.expandPanel('functional');
    await this.functionalForm.selectVideoQuality(quality);
    await this.waitForCalculationComplete();
  }

  /**
   * 点击导出按钮
   */
  async clickExport(): Promise<void> {
    await this.exportButton.click();
  }

  /**
   * 点击分享按钮
   */
  async clickShare(): Promise<void> {
    await this.shareButton.click();
  }

  /**
   * 点击保存按钮
   */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * 验证页面加载成功
   */
  async expectPageLoaded(): Promise<void> {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.collapsePanelContainer).toBeVisible();
  }

  /**
   * 验证实时计算指示器显示
   */
  async expectRealTimeIndicatorVisible(): Promise<void> {
    await expect(this.realTimeIndicator).toBeVisible();
  }

  /**
   * 验证结果区域显示
   */
  async expectResultsVisible(): Promise<void> {
    await this.resultDisplay.expectResultsVisible();
  }

  /**
   * 验证访客模式提示显示
   */
  async expectGuestAlertVisible(): Promise<void> {
    await expect(this.guestAlert).toBeVisible();
  }

  /**
   * 关闭访客模式提示
   */
  async dismissGuestAlert(): Promise<void> {
    const closeButton = this.guestAlert.locator('.ant-alert-close-icon');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  /**
   * 获取当前月度总费用
   */
  async getMonthlyTotal(): Promise<number> {
    const value = await this.resultDisplay.getMonthlyTotal();
    return parseFloat(value.replace(/[$,]/g, ''));
  }

  /**
   * 获取当前设备数量显示值
   */
  async getDisplayedDeviceCount(): Promise<number> {
    const value = await this.resultDisplay.getDeviceCount();
    return parseInt(value.replace(/[^0-9]/g, ''), 10);
  }

  /**
   * 验证月度费用大于零
   */
  async expectPositiveMonthlyTotal(): Promise<void> {
    await this.resultDisplay.expectPositiveMonthlyTotal();
  }

  /**
   * 快速完成计算流程（选择场景并验证结果）
   */
  async quickCalculateWithScenario(scenarioName?: string): Promise<void> {
    if (scenarioName) {
      await this.selectScenario(scenarioName);
    } else {
      await this.selectFirstScenario();
    }
    await this.expectResultsVisible();
    await this.expectPositiveMonthlyTotal();
  }

  /**
   * 自定义配置并计算
   */
  async customConfiguration(config: {
    deviceCount?: number;
    recordingMode?: string;
    retentionDays?: number;
    videoQuality?: string;
  }): Promise<void> {
    if (config.deviceCount !== undefined) {
      await this.setDeviceCount(config.deviceCount);
    }
    if (config.recordingMode) {
      await this.setRecordingMode(config.recordingMode);
    }
    if (config.retentionDays !== undefined) {
      await this.setRetentionDays(config.retentionDays);
    }
    if (config.videoQuality) {
      await this.setVideoQuality(config.videoQuality);
    }
  }
}
