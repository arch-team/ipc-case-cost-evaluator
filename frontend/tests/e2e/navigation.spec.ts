/**
 * 页面导航 E2E 测试
 */
import { test, expect } from '@playwright/test';
import { HomePage, CalculatorPage, EvaluationsPage } from './pages';

test.describe('页面导航', () => {
  test.describe('侧边栏导航', () => {
    test('从首页导航到计算器页面', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await homePage.navigateToCalculator();

      await expect(page).toHaveURL(/.*calculator/);
    });

    test('从首页导航到评估管理页面', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await homePage.navigateToEvaluations();

      await expect(page).toHaveURL(/.*evaluations/);
    });

    test('从首页导航到设置页面', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await homePage.navigateToSettings();

      await expect(page).toHaveURL(/.*settings/);
    });

    test('从计算器页面导航到其他页面', async ({ page }) => {
      const calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();

      // 使用 HomePage 的导航
      const homePage = new HomePage(page);

      // 导航到评估管理
      await homePage.navigateToEvaluations();
      await expect(page).toHaveURL(/.*evaluations/);

      // 导航回计算器
      await homePage.navigateToCalculator();
      await expect(page).toHaveURL(/.*calculator/);
    });
  });

  test.describe('直接 URL 访问', () => {
    test('直接访问计算器页面', async ({ page }) => {
      await page.goto('/calculator');
      await expect(page).toHaveURL(/.*calculator/);

      // 验证页面内容加载
      const calculatorPage = new CalculatorPage(page);
      await calculatorPage.waitForPageReady();
    });

    test('直接访问评估管理页面', async ({ page }) => {
      await page.goto('/evaluations');
      await expect(page).toHaveURL(/.*evaluations/);

      const evaluationsPage = new EvaluationsPage(page);
      await evaluationsPage.waitForPageReady();
    });

    test('直接访问设置页面', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/.*settings/);
    });

    test('访问根路径重定向', async ({ page }) => {
      await page.goto('/');
      // 验证页面加载成功
      const homePage = new HomePage(page);
      await homePage.waitForPageReady();
    });
  });

  test.describe('计算器步骤导航', () => {
    let calculatorPage: CalculatorPage;

    test.beforeEach(async ({ page }) => {
      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();
      await calculatorPage.scenarioSelector.waitForScenariosLoaded();
    });

    test('步骤指示器显示正确', async ({ page }) => {
      // 初始在步骤 0
      await calculatorPage.expectStep(0);

      // 验证步骤指示器存在
      await expect(calculatorPage.steps).toBeVisible();

      // 验证有 5 个步骤
      const stepItems = page.locator('.ant-steps-item');
      await expect(stepItems).toHaveCount(5);
    });

    test('步骤标题正确', async ({ page }) => {
      const stepTitles = ['选择场景', '功能配置', '技术选项', '价格设置', '计算结果'];

      for (const title of stepTitles) {
        const stepItem = page.locator('.ant-steps-item').filter({
          has: page.locator(`text=${title}`),
        });
        await expect(stepItem).toBeVisible();
      }
    });

    test('完成步骤后显示完成状态', async ({ page }) => {
      // 点击自定义配置进入步骤 1
      await calculatorPage.scenarioSelector.clickCustom();
      await calculatorPage.expectStep(1);

      // 步骤 0 应该显示完成状态
      const step0 = page.locator('.ant-steps-item').first();
      await expect(step0).toHaveClass(/ant-steps-item-finish/);
    });

    test('当前步骤高亮显示', async ({ page }) => {
      // 初始步骤 0 高亮
      let activeStep = page.locator('.ant-steps-item-active');
      await expect(activeStep).toContainText('选择场景');

      // 进入步骤 1
      await calculatorPage.scenarioSelector.clickCustom();

      // 步骤 1 高亮
      activeStep = page.locator('.ant-steps-item-active');
      await expect(activeStep).toContainText('功能配置');
    });
  });

  test.describe('浏览器后退/前进', () => {
    test('浏览器后退按钮', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      // 导航到计算器
      await homePage.navigateToCalculator();
      await expect(page).toHaveURL(/.*calculator/);

      // 浏览器后退
      await page.goBack();

      // 应该回到首页
      await expect(page).toHaveURL(/^\/$|\/$/);
    });

    test('浏览器前进按钮', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      // 导航到计算器
      await homePage.navigateToCalculator();
      await expect(page).toHaveURL(/.*calculator/);

      // 后退
      await page.goBack();

      // 前进
      await page.goForward();

      // 应该回到计算器
      await expect(page).toHaveURL(/.*calculator/);
    });
  });

  test.describe('页面刷新', () => {
    test('计算器页面刷新后保持', async ({ page }) => {
      const calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();

      // 刷新页面
      await page.reload();

      // 验证仍在计算器页面
      await expect(page).toHaveURL(/.*calculator/);
      await calculatorPage.waitForPageReady();
    });
  });

  test.describe('404 处理', () => {
    test('访问不存在的路径', async ({ page }) => {
      await page.goto('/non-existent-page');

      // 应该有某种 404 处理（重定向或显示错误）
      // 具体行为取决于应用实现
      // 这里验证页面可访问
      await page.waitForLoadState('networkidle');
    });
  });
});
