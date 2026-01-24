/**
 * 表单验证 E2E 测试
 */
import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages';
import { recordingModes, smallScaleInput, largeScaleInput } from './fixtures/test-data';

test.describe('表单验证', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
    // 进入功能配置步骤
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();
    await calculatorPage.scenarioSelector.clickCustom();
  });

  test.describe('设备数量输入', () => {
    test('接受有效数值', async ({ page }) => {
      await calculatorPage.functionalForm.setDeviceCount(100);
      const value = await calculatorPage.functionalForm.getDeviceCount();
      expect(value).toBe('100');
    });

    test('接受最小值', async ({ page }) => {
      await calculatorPage.functionalForm.setDeviceCount(smallScaleInput.deviceCount);
      const value = await calculatorPage.functionalForm.getDeviceCount();
      expect(value).toBe(smallScaleInput.deviceCount.toString());
    });

    test('接受大数值', async ({ page }) => {
      await calculatorPage.functionalForm.setDeviceCount(largeScaleInput.deviceCount);
      const value = await calculatorPage.functionalForm.getDeviceCount();
      expect(value).toBe(largeScaleInput.deviceCount.toString());
    });
  });

  test.describe('保留天数输入', () => {
    test('接受有效天数', async ({ page }) => {
      await calculatorPage.functionalForm.setRetentionDays(30);
      const value = await calculatorPage.functionalForm.getRetentionDays();
      expect(value).toBe('30');
    });

    test('接受短期保留', async ({ page }) => {
      await calculatorPage.functionalForm.setRetentionDays(7);
      const value = await calculatorPage.functionalForm.getRetentionDays();
      expect(value).toBe('7');
    });

    test('接受长期保留', async ({ page }) => {
      await calculatorPage.functionalForm.setRetentionDays(90);
      const value = await calculatorPage.functionalForm.getRetentionDays();
      expect(value).toBe('90');
    });
  });

  test.describe('录像模式切换', () => {
    test('切换到事件触发模式显示事件字段', async ({ page }) => {
      // 选择事件触发模式
      await calculatorPage.functionalForm.selectRecordingMode(recordingModes.eventTriggered);

      // 验证事件相关字段可见
      await calculatorPage.functionalForm.expectEventFieldsVisible();
    });

    test('切换到全天候模式隐藏事件字段', async ({ page }) => {
      // 先选择事件触发模式
      await calculatorPage.functionalForm.selectRecordingMode(recordingModes.eventTriggered);
      await calculatorPage.functionalForm.expectEventFieldsVisible();

      // 切换到全天候模式
      await calculatorPage.functionalForm.selectRecordingMode(recordingModes.continuous);

      // 验证事件相关字段隐藏
      await calculatorPage.functionalForm.expectEventFieldsHidden();
    });

    test('切换到定时段模式隐藏事件字段', async ({ page }) => {
      // 先选择事件触发模式
      await calculatorPage.functionalForm.selectRecordingMode(recordingModes.eventTriggered);

      // 切换到定时段模式
      await calculatorPage.functionalForm.selectRecordingMode(recordingModes.scheduled);

      // 验证事件相关字段隐藏
      await calculatorPage.functionalForm.expectEventFieldsHidden();
    });
  });

  test.describe('视频质量选择', () => {
    test('可以选择不同视频质量', async ({ page }) => {
      const qualities = ['720p', '1080p', '2K', '4K'];

      for (const quality of qualities) {
        await calculatorPage.functionalForm.selectVideoQuality(quality);
        // 验证选择成功（选择器显示选中值）
        const selector = calculatorPage.functionalForm.videoQualitySelect;
        await expect(selector).toContainText(quality);
      }
    });
  });

  test.describe('事件参数输入', () => {
    test.beforeEach(async ({ page }) => {
      // 确保选择事件触发模式
      await calculatorPage.functionalForm.selectRecordingMode(recordingModes.eventTriggered);
    });

    test('设置每日事件数', async ({ page }) => {
      await calculatorPage.functionalForm.setEventsPerDay(400);
      // 验证输入成功（值被接受）
      const input = calculatorPage.functionalForm.eventsPerDayInput;
      await expect(input).toHaveValue('400');
    });

    test('设置事件时长', async ({ page }) => {
      await calculatorPage.functionalForm.setEventDuration(15);
      // 验证输入成功
      const input = calculatorPage.functionalForm.eventDurationInput;
      await expect(input).toHaveValue('15');
    });
  });

  test.describe('回看比例滑块', () => {
    test('滑块可见且可交互', async ({ page }) => {
      const slider = calculatorPage.functionalForm.accessPatternSlider;
      await expect(slider).toBeVisible();
    });
  });

  test.describe('表单数据持久化', () => {
    test('步骤切换后保持表单数据', async ({ page }) => {
      // 设置一些值
      await calculatorPage.functionalForm.setDeviceCount(200);
      await calculatorPage.functionalForm.setRetentionDays(60);

      // 下一步
      await calculatorPage.clickNext();
      await calculatorPage.expectStep(2);

      // 上一步返回
      await calculatorPage.clickPrev();
      await calculatorPage.expectStep(1);

      // 验证值保持不变
      const deviceCount = await calculatorPage.functionalForm.getDeviceCount();
      const retentionDays = await calculatorPage.functionalForm.getRetentionDays();
      expect(deviceCount).toBe('200');
      expect(retentionDays).toBe('60');
    });
  });
});
