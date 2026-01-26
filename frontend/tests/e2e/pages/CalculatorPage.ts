/**
 * 计算器页面 Page Object
 */
import { Page, Locator, expect } from '@playwright/test';
import { ScenarioSelector } from './components/ScenarioSelector';
import { FunctionalForm } from './components/FunctionalForm';
import { ResultDisplay } from './components/ResultDisplay';

export class CalculatorPage {
  readonly page: Page;
  readonly scenarioSelector: ScenarioSelector;
  readonly functionalForm: FunctionalForm;
  readonly resultDisplay: ResultDisplay;

  // 步骤导航
  readonly steps: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly calculateButton: Locator;
  readonly resetButton: Locator;

  // 加载状态
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scenarioSelector = new ScenarioSelector(page);
    this.functionalForm = new FunctionalForm(page);
    this.resultDisplay = new ResultDisplay(page);

    // 步骤组件
    this.steps = page.locator('.ant-steps');
    this.prevButton = page.getByRole('button', { name: '上一步' });
    this.nextButton = page.getByRole('button', { name: '下一步' });
    this.calculateButton = page.getByRole('button', { name: '开始计算' });
    this.resetButton = page.getByRole('button', { name: '重新计算' });

    // 加载指示器
    this.loadingIndicator = page.locator('.ant-spin');
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
    await this.steps.waitFor({ state: 'visible' });
  }

  /**
   * 获取当前步骤索引（从 0 开始）
   */
  async getCurrentStep(): Promise<number> {
    const allSteps = this.page.locator('.ant-steps-item');
    const count = await allSteps.count();

    for (let i = 0; i < count; i++) {
      const step = allSteps.nth(i);
      if (await step.evaluate(el => el.classList.contains('ant-steps-item-active'))) {
        return i;
      }
    }
    return 0;
  }

  /**
   * 点击下一步
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * 点击上一步
   */
  async clickPrev(): Promise<void> {
    await this.prevButton.click();
  }

  /**
   * 点击开始计算
   */
  async clickCalculate(): Promise<void> {
    // 先监听响应，再点击按钮
    const responsePromise = this.page.waitForResponse(
      resp => resp.url().includes('/api/v1/calculate'),
      { timeout: 30000 }
    );
    await this.calculateButton.click();
    await responsePromise;
    // 等待页面更新
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 点击重新计算
   */
  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /**
   * 验证当前步骤
   */
  async expectStep(stepIndex: number): Promise<void> {
    const currentStep = await this.getCurrentStep();
    expect(currentStep).toBe(stepIndex);
  }

  /**
   * 完整的计算流程：选择场景 → 查看结果
   */
  async quickCalculateWithScenario(scenarioName: string): Promise<void> {
    await this.scenarioSelector.selectScenario(scenarioName);
    // 选择场景后自动跳转到步骤 1
    await this.clickNext(); // 步骤 1 → 2
    await this.clickNext(); // 步骤 2 → 3
    await this.clickCalculate(); // 步骤 3 → 4（计算）
  }

  /**
   * 自定义配置流程
   */
  async customConfiguration(config: {
    deviceCount?: number;
    recordingMode?: string;
    retentionDays?: number;
  }): Promise<void> {
    // 点击自定义配置
    await this.scenarioSelector.clickCustom();

    // 填写功能配置
    if (config.deviceCount) {
      await this.functionalForm.setDeviceCount(config.deviceCount);
    }
    if (config.recordingMode) {
      await this.functionalForm.selectRecordingMode(config.recordingMode);
    }
    if (config.retentionDays) {
      await this.functionalForm.setRetentionDays(config.retentionDays);
    }

    // 继续到下一步
    await this.clickNext(); // 功能配置 → 技术选项
    await this.clickNext(); // 技术选项 → 价格设置
    await this.clickCalculate(); // 价格设置 → 计算结果
  }
}
