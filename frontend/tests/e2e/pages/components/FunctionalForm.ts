/**
 * 功能配置表单组件 Page Object
 */
import { Page, Locator, expect } from '@playwright/test';

export class FunctionalForm {
  readonly page: Page;

  // 设备数量
  readonly deviceCountInput: Locator;

  // 录像模式
  readonly recordingModeSelect: Locator;

  // 视频质量
  readonly videoQualitySelect: Locator;

  // 事件触发模式特有字段
  readonly eventsPerDayInput: Locator;
  readonly eventDurationInput: Locator;

  // 保留天数
  readonly retentionDaysInput: Locator;

  // 回看比例
  readonly accessPatternSlider: Locator;

  constructor(page: Page) {
    this.page = page;

    // 使用表单项标签定位输入框
    this.deviceCountInput = page.locator('.ant-form-item').filter({
      has: page.locator('label:text("设备数量")')
    }).locator('.ant-input-number-input');

    this.recordingModeSelect = page.locator('.ant-form-item').filter({
      has: page.locator('label:text("录像模式")')
    }).locator('.ant-select');

    this.videoQualitySelect = page.locator('.ant-form-item').filter({
      has: page.locator('label:text("视频质量")')
    }).locator('.ant-select');

    this.eventsPerDayInput = page.locator('.ant-form-item').filter({
      has: page.locator('label:text("每日事件数")')
    }).locator('.ant-input-number-input');

    this.eventDurationInput = page.locator('.ant-form-item').filter({
      has: page.locator('label:text("事件时长")')
    }).locator('.ant-input-number-input');

    this.retentionDaysInput = page.locator('.ant-form-item').filter({
      has: page.locator('label:text("保留天数")')
    }).locator('.ant-input-number-input');

    this.accessPatternSlider = page.locator('.ant-form-item').filter({
      has: page.locator('label:text("回看比例")')
    }).locator('.ant-slider');
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
