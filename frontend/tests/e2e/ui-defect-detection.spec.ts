/**
 * UI 显示缺陷验证 E2E 测试
 *
 * 验证以下缺陷类型：
 * 1. 数值精度问题（小数位数、货币格式）
 * 2. 数值一致性（月度/年度关系、占比总和）
 * 3. 表格数据完整性（必要列、必要行）
 * 4. 边界值显示（零值、大数值、负值防护）
 * 5. 百分比显示（总和应为 100%）
 */
import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages';
import { expectedTableColumns, expectedCostTypes, tolerances } from './fixtures/test-data';

/**
 * 验证数值格式（2位小数）
 * 注意：Ant Design Statistic 组件的 prefix 是单独渲染的，值本身不含 $
 */
function verify2DecimalFormat(value: string): boolean {
  // 匹配 X.XX 或 X,XXX.XX 格式（可带 $ 前缀）
  const pattern = /^\$?[\d,]+\.\d{2}$/;
  return pattern.test(value);
}

/**
 * 验证数值格式（4位小数）
 */
function verify4DecimalFormat(value: string): boolean {
  // 匹配 X.XXXX 或 X,XXX.XXXX 格式（可带 $ 前缀）
  const pattern = /^\$?[\d,]+\.\d{4}$/;
  return pattern.test(value);
}

test.describe('UI 缺陷检测', () => {
  let calculatorPage: CalculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();

    // 快速完成计算到达结果页面
    await calculatorPage.scenarioSelector.waitForScenariosLoaded();
    await calculatorPage.scenarioSelector.selectFirstScenario();
    await calculatorPage.clickNext();
    await calculatorPage.clickNext();
    await calculatorPage.clickCalculate();

    // 等待结果加载完成
    await calculatorPage.resultDisplay.waitForResultsLoaded();
  });

  test.describe('数值精度验证', () => {
    test('月度费用保留2位小数', async () => {
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      // 验证格式为 X.XX 或 X,XXX.XX（Ant Design 的 prefix 单独渲染）
      expect(verify2DecimalFormat(monthlyStr)).toBe(true);
    });

    test('年度费用保留2位小数', async () => {
      const yearlyStr = await calculatorPage.resultDisplay.getYearlyTotal();
      expect(verify2DecimalFormat(yearlyStr)).toBe(true);
    });

    test('单设备费用保留4位小数', async () => {
      const perDeviceStr = await calculatorPage.resultDisplay.getPerDeviceMonthly();
      expect(verify4DecimalFormat(perDeviceStr)).toBe(true);
    });

    test('费用明细表格月度费用保留2位小数', async () => {
      const items = await calculatorPage.resultDisplay.getBreakdownItems();
      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        // 月度费用应为 $X.XX 格式
        expect(verify2DecimalFormat(item.monthly)).toBe(true);
      }
    });

    test('费用明细表格年度费用保留2位小数', async () => {
      const items = await calculatorPage.resultDisplay.getBreakdownItems();
      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        // 年度费用应为 $X.XX 格式
        expect(verify2DecimalFormat(item.yearly)).toBe(true);
      }
    });

    test('费用明细表格单价格式正确', async () => {
      const items = await calculatorPage.resultDisplay.getBreakdownItems();
      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        // 单价应为 $X.XXXX/单位 格式或 - 表示无单价
        if (item.unitPrice !== '-') {
          expect(item.unitPrice).toMatch(/^\$[\d.]+\/.+$/);
        }
      }
    });

    test('请求次数为整数格式', async () => {
      const metrics = await calculatorPage.resultDisplay.getMetrics();
      // PUT 请求次数应为整数（无小数点）
      expect(metrics.puts).not.toContain('.');
    });

    test('存储量保留2位小数', async () => {
      const metrics = await calculatorPage.resultDisplay.getMetrics();
      // 存储量应有小数
      expect(metrics.storage).toMatch(/[\d,]+\.\d{2}/);
    });
  });

  test.describe('数值一致性验证', () => {
    test('年度费用 = 月度费用 × 12', async () => {
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      const yearlyStr = await calculatorPage.resultDisplay.getYearlyTotal();

      const monthly = calculatorPage.resultDisplay.parseMonetary(monthlyStr);
      const yearly = calculatorPage.resultDisplay.parseMonetary(yearlyStr);

      expect(yearly).toBeCloseTo(monthly * 12, 1);
    });

    test('单设备月均 × 设备数 ≈ 月度总费用', async () => {
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      const perDeviceStr = await calculatorPage.resultDisplay.getPerDeviceMonthly();
      const deviceCountStr = await calculatorPage.resultDisplay.getDeviceCount();

      const monthly = calculatorPage.resultDisplay.parseMonetary(monthlyStr);
      const perDevice = calculatorPage.resultDisplay.parseMonetary(perDeviceStr);
      const deviceCount = parseInt(deviceCountStr, 10);

      // 允许小误差（浮点精度问题）
      const calculated = perDevice * deviceCount;
      expect(Math.abs(calculated - monthly)).toBeLessThan(monthly * tolerances.costCalculation);
    });

    test('费用明细各项之和等于月度总费用', async () => {
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      const monthly = calculatorPage.resultDisplay.parseMonetary(monthlyStr);

      const items = await calculatorPage.resultDisplay.getBreakdownItems();
      let itemsSum = 0;
      for (const item of items) {
        itemsSum += calculatorPage.resultDisplay.parseMonetary(item.monthly);
      }

      // 允许小误差
      expect(Math.abs(itemsSum - monthly)).toBeLessThan(monthly * tolerances.costCalculation + 0.01);
    });

    test('表格合计行月度费用 = 月度总费用', async () => {
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      const monthly = calculatorPage.resultDisplay.parseMonetary(monthlyStr);

      const summary = await calculatorPage.resultDisplay.getTableSummary();

      expect(Math.abs(summary.monthly - monthly)).toBeLessThan(0.01);
    });

    test('表格合计行年度费用 = 月度 × 12', async () => {
      const summary = await calculatorPage.resultDisplay.getTableSummary();

      expect(summary.yearly).toBeCloseTo(summary.monthly * 12, 1);
    });

    test('每行年度费用 = 该行月度 × 12', async () => {
      const items = await calculatorPage.resultDisplay.getBreakdownItems();

      for (const item of items) {
        const monthly = calculatorPage.resultDisplay.parseMonetary(item.monthly);
        const yearly = calculatorPage.resultDisplay.parseMonetary(item.yearly);

        // 对于非常小的值（如 $0.00），四舍五入可能导致不精确
        // 例如：月度 $0.005 显示为 $0.00，年度 $0.06 = $0.005 * 12
        // 使用绝对误差容差而非相对比较
        const expectedYearly = monthly * 12;
        const tolerance = 0.1; // 允许 $0.10 的误差
        expect(Math.abs(yearly - expectedYearly)).toBeLessThan(tolerance);
      }
    });
  });

  test.describe('占比验证', () => {
    test('所有占比总和约等于100%', async () => {
      const percentages = await calculatorPage.resultDisplay.getPercentages();
      expect(percentages.length).toBeGreaterThan(0);

      const sum = percentages.reduce((acc, val) => acc + val, 0);
      // 允许 ±0.5% 的误差（由于四舍五入）
      expect(Math.abs(sum - 100)).toBeLessThan(tolerances.percentSum);
    });

    test('占比值在 0-100% 范围内', async () => {
      const percentages = await calculatorPage.resultDisplay.getPercentages();

      for (const percent of percentages) {
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      }
    });

    test('无负数占比', async () => {
      const percentages = await calculatorPage.resultDisplay.getPercentages();

      for (const percent of percentages) {
        expect(percent).toBeGreaterThanOrEqual(0);
      }
    });

    test('高占比项（>50%）应显示红色标签', async () => {
      const percentages = await calculatorPage.resultDisplay.getPercentages();
      const highPercentTags = await calculatorPage.resultDisplay.getHighPercentTags();

      // 检查是否有 >50% 的占比
      const hasHighPercent = percentages.some((p) => p > 50);
      const highTagCount = await highPercentTags.count();

      if (hasHighPercent) {
        // 如果有高占比，应该有红色标签
        expect(highTagCount).toBeGreaterThan(0);
      }
    });

    test('中占比项（20-50%）应显示橙色标签', async () => {
      const percentages = await calculatorPage.resultDisplay.getPercentages();
      const mediumPercentTags = await calculatorPage.resultDisplay.getMediumPercentTags();

      // 检查是否有 20-50% 的占比
      const hasMediumPercent = percentages.some((p) => p > 20 && p <= 50);
      const mediumTagCount = await mediumPercentTags.count();

      if (hasMediumPercent) {
        // 如果有中等占比，应该有橙色标签
        expect(mediumTagCount).toBeGreaterThan(0);
      }
    });

    test('表格合计行占比为100%', async () => {
      const summary = await calculatorPage.resultDisplay.getTableSummary();
      expect(summary.percentTotal).toBe('100%');
    });
  });

  test.describe('边界值处理', () => {
    test('无负值费用出现', async () => {
      // 检查统计卡片
      const monthlyStr = await calculatorPage.resultDisplay.getMonthlyTotal();
      const yearlyStr = await calculatorPage.resultDisplay.getYearlyTotal();
      const perDeviceStr = await calculatorPage.resultDisplay.getPerDeviceMonthly();

      expect(calculatorPage.resultDisplay.parseMonetary(monthlyStr)).toBeGreaterThanOrEqual(0);
      expect(calculatorPage.resultDisplay.parseMonetary(yearlyStr)).toBeGreaterThanOrEqual(0);
      expect(calculatorPage.resultDisplay.parseMonetary(perDeviceStr)).toBeGreaterThanOrEqual(0);

      // 检查表格中的费用
      const items = await calculatorPage.resultDisplay.getBreakdownItems();
      for (const item of items) {
        expect(calculatorPage.resultDisplay.parseMonetary(item.monthly)).toBeGreaterThanOrEqual(0);
        expect(calculatorPage.resultDisplay.parseMonetary(item.yearly)).toBeGreaterThanOrEqual(0);
      }
    });

    test('设备数量为正整数', async () => {
      const deviceCountStr = await calculatorPage.resultDisplay.getDeviceCount();
      const deviceCount = parseInt(deviceCountStr, 10);

      expect(deviceCount).toBeGreaterThan(0);
      expect(Number.isInteger(deviceCount)).toBe(true);
    });

    test('使用量指标非负', async () => {
      const metrics = await calculatorPage.resultDisplay.getMetrics();

      // 存储量 >= 0
      const storage = parseFloat(metrics.storage.replace(/[,GB]/g, ''));
      expect(storage).toBeGreaterThanOrEqual(0);

      // PUT 请求次数 >= 0
      const puts = parseInt(metrics.puts.replace(/[,次]/g, ''), 10);
      expect(puts).toBeGreaterThanOrEqual(0);

      // 数据传输量 >= 0
      const transfer = parseFloat(metrics.transfer.replace(/[,GB]/g, ''));
      expect(transfer).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('数据完整性验证', () => {
    test('费用明细表格有7列（含展开按钮列）', async () => {
      // 只检查费用明细表格的列数（第一个表格）
      const firstTable = calculatorPage.resultDisplay.breakdownTable.first();
      const columnCount = await firstTable.locator('thead th').count();
      expect(columnCount).toBe(expectedTableColumns);
    });

    test('必须包含存储费用', async ({ page }) => {
      await expect(page.getByText(expectedCostTypes.storage)).toBeVisible();
    });

    test('必须包含PUT请求费用', async ({ page }) => {
      await expect(page.getByText(expectedCostTypes.put)).toBeVisible();
    });

    test('必须包含GET请求费用', async ({ page }) => {
      await expect(page.getByText(expectedCostTypes.get)).toBeVisible();
    });

    test('统计卡片数值非空', async () => {
      const monthly = await calculatorPage.resultDisplay.getMonthlyTotal();
      const yearly = await calculatorPage.resultDisplay.getYearlyTotal();
      const perDevice = await calculatorPage.resultDisplay.getPerDeviceMonthly();
      const deviceCount = await calculatorPage.resultDisplay.getDeviceCount();

      expect(monthly).not.toBe('');
      expect(yearly).not.toBe('');
      expect(perDevice).not.toBe('');
      expect(deviceCount).not.toBe('');
    });

    test('统计卡片数值大于零', async () => {
      const monthly = calculatorPage.resultDisplay.parseMonetary(
        await calculatorPage.resultDisplay.getMonthlyTotal()
      );
      const yearly = calculatorPage.resultDisplay.parseMonetary(
        await calculatorPage.resultDisplay.getYearlyTotal()
      );
      const perDevice = calculatorPage.resultDisplay.parseMonetary(
        await calculatorPage.resultDisplay.getPerDeviceMonthly()
      );
      const deviceCount = parseInt(await calculatorPage.resultDisplay.getDeviceCount(), 10);

      expect(monthly).toBeGreaterThan(0);
      expect(yearly).toBeGreaterThan(0);
      expect(perDevice).toBeGreaterThan(0);
      expect(deviceCount).toBeGreaterThan(0);
    });

    test('使用量指标非空', async () => {
      const metrics = await calculatorPage.resultDisplay.getMetrics();

      expect(metrics.storage).not.toBe('');
      expect(metrics.puts).not.toBe('');
      expect(metrics.transfer).not.toBe('');
    });

    test('费用明细表格至少有3行数据', async () => {
      const items = await calculatorPage.resultDisplay.getBreakdownItems();
      // 至少应有存储费用、PUT 请求费用、GET 请求费用
      expect(items.length).toBeGreaterThanOrEqual(3);
    });

    test('每行数据所有字段非空', async () => {
      const items = await calculatorPage.resultDisplay.getBreakdownItems();

      for (const item of items) {
        expect(item.name).not.toBe('');
        expect(item.monthly).not.toBe('');
        expect(item.yearly).not.toBe('');
        expect(item.percent).not.toBe('');
        // unitPrice 和 quantity 可能为 "-"
      }
    });
  });

  test.describe('表格结构验证', () => {
    test('表格列顺序正确', async () => {
      const headers = calculatorPage.resultDisplay.breakdownTable.locator('thead th');
      const headerTexts: string[] = [];

      const count = await headers.count();
      for (let i = 0; i < count; i++) {
        const text = (await headers.nth(i).textContent()) || '';
        headerTexts.push(text.trim());
      }

      // 验证列顺序（第一列是展开按钮列，为空）
      // 列索引: 0=展开按钮, 1=费用类型, 2=单价, 3=用量, 4=月度费用, 5=年度费用, 6=占比
      expect(headerTexts[1]).toContain('费用类型');
      expect(headerTexts[2]).toContain('单价');
      expect(headerTexts[3]).toContain('用量');
      expect(headerTexts[4]).toContain('月度费用');
      expect(headerTexts[5]).toContain('年度费用');
      expect(headerTexts[6]).toContain('占比');
    });

    test('表格有合计行', async () => {
      const summaryRow = calculatorPage.resultDisplay.breakdownTable.locator(
        '.ant-table-summary tr'
      );
      await expect(summaryRow).toBeVisible();

      // 合计行包含"合计"文字
      await expect(summaryRow.getByText('合计')).toBeVisible();
    });
  });
});
