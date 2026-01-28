/**
 * 功能配置表单组件 Page Object
 * 适配优化后的三列紧凑设计布局
 */
import { Page, Locator, expect } from '@playwright/test';

export class FunctionalForm {
  readonly page: Page;

  // 设备数量 - 在 form-horizontal-item 中
  readonly deviceCountInput: Locator;

  // 录像模式 - 在录像策略分组中
  readonly recordingModeSelect: Locator;

  // 视频质量 - 在录像策略分组中
  readonly videoQualitySelect: Locator;

  // 事件触发模式特有字段 - 在 form-conditional-section 中
  readonly eventsPerDayInput: Locator;
  readonly eventDurationInput: Locator;

  // 保留天数 - 现在在技术维度面板顶部
  readonly retentionDaysInput: Locator;

  // 访问模式区域
  readonly accessPatternSection: Locator;

  constructor(page: Page) {
    this.page = page;

    // 设备数量 - 在基础配置分组的 form-horizontal-item 中
    this.deviceCountInput = page.locator('.form-horizontal-item').filter({
      hasText: '设备数量'
    }).locator('.ant-input-number-input');

    // 录像模式 - 使用 Form.Item 的 label
    this.recordingModeSelect = page.locator('.dimension-form .ant-form-item').filter({
      has: page.locator('label:has-text("录像模式")')
    }).locator('.ant-select');

    // 视频质量 - 使用 Form.Item 的 label
    this.videoQualitySelect = page.locator('.dimension-form .ant-form-item').filter({
      has: page.locator('label:has-text("视频质量")')
    }).locator('.ant-select');

    // 事件参数 - 在条件显示区域内
    this.eventsPerDayInput = page.locator('.form-conditional-section .ant-form-item').filter({
      has: page.locator('label:has-text("每日事件数")')
    }).locator('.ant-input-number-input');

    this.eventDurationInput = page.locator('.form-conditional-section .ant-form-item').filter({
      has: page.locator('label:has-text("事件时长")')
    }).locator('.ant-input-number-input');

    // 保留天数 - 在技术维度面板顶部，不在功能维度表单中
    this.retentionDaysInput = page.locator('.input-panel .ant-input-number-input').first();

    // 访问模式区域
    this.accessPatternSection = page.locator('.form-group').filter({
      hasText: '访问模式'
    });
  }

  /**
   * 设置设备数量
   */
  async setDeviceCount(count: number): Promise<void> {
    await this.deviceCountInput.clear();
    await this.deviceCountInput.fill(count.toString());
  }

  /**
   * 选择录像模式
   */
  async selectRecordingMode(mode: string): Promise<void> {
    await this.recordingModeSelect.click();
    const modeOption = this.page.locator('.ant-select-item-option').filter({
      has: this.page.locator(`text=${mode}`),
    });
    await modeOption.click();
  }

  /**
   * 选择视频质量
   */
  async selectVideoQuality(quality: string): Promise<void> {
    await this.videoQualitySelect.click();
    const qualityOption = this.page.locator('.ant-select-item-option').filter({
      has: this.page.locator(`text=${quality}`),
    });
    await qualityOption.click();
  }

  /**
   * 设置每日事件数
   */
  async setEventsPerDay(events: number): Promise<void> {
    await this.eventsPerDayInput.clear();
    await this.eventsPerDayInput.fill(events.toString());
  }

  /**
   * 设置事件时长
   */
  async setEventDuration(seconds: number): Promise<void> {
    await this.eventDurationInput.clear();
    await this.eventDurationInput.fill(seconds.toString());
  }

  /**
   * 设置保留天数
   */
  async setRetentionDays(days: number): Promise<void> {
    await this.retentionDaysInput.clear();
    await this.retentionDaysInput.fill(days.toString());
  }

  /**
   * 设置回看比例（通过点击滑块）
   */
  async setAccessPattern(percentage: number): Promise<void> {
    // 滑块交互比较复杂，这里使用 JavaScript 直接设置值
    const slider = this.accessPatternSlider;
    await slider.evaluate((el, value) => {
      // 触发 Ant Design Slider 的值变化
      const event = new CustomEvent('change', { detail: value });
      el.dispatchEvent(event);
    }, percentage);
  }

  /**
   * 验证事件触发字段是否可见
   */
  async expectEventFieldsVisible(): Promise<void> {
    await expect(this.eventsPerDayInput).toBeVisible();
    await expect(this.eventDurationInput).toBeVisible();
  }

  /**
   * 验证事件触发字段是否隐藏
   */
  async expectEventFieldsHidden(): Promise<void> {
    await expect(this.eventsPerDayInput).not.toBeVisible();
    await expect(this.eventDurationInput).not.toBeVisible();
  }

  /**
   * 获取设备数量当前值
   */
  async getDeviceCount(): Promise<string> {
    return await this.deviceCountInput.inputValue();
  }

  /**
   * 获取保留天数当前值
   */
  async getRetentionDays(): Promise<string> {
    return await this.retentionDaysInput.inputValue();
  }
}
