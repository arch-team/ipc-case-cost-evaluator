import { test } from '@playwright/test';

test.describe('UX 分析 - IPC Case Cost Evaluator', () => {
  test('捕获首页截图并分析 UX', async ({ page }) => {
    // 设置视口大小为常见的桌面分辨率
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 访问首页
    await page.goto('http://localhost:5178/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待页面加载完成
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // 确保所有动画和异步内容加载完成

    // 截取全页面截图
    await page.screenshot({
      path: 'tests/e2e/screenshots/homepage-full.png',
      fullPage: true
    });

    // 截取视口截图
    await page.screenshot({
      path: 'tests/e2e/screenshots/homepage-viewport.png',
      fullPage: false
    });

    // 捕获不同设备视图
    // 平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: 'tests/e2e/screenshots/homepage-tablet.png',
      fullPage: false
    });

    // 手机视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: 'tests/e2e/screenshots/homepage-mobile.png',
      fullPage: false
    });

    // 恢复桌面视图进行交互分析
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 分析页面元素
    const pageTitle = await page.title();
    console.log('页面标题:', pageTitle);

    // 检查主要导航元素
    const hasNavigation = await page.locator('nav, [role="navigation"], .nav, .menu').count() > 0;
    console.log('是否有导航菜单:', hasNavigation);

    // 检查表单元素
    const formElements = await page.locator('form, input, select, textarea, button').count();
    console.log('表单元素数量:', formElements);

    // 检查响应式元素
    const hasResponsiveElements = await page.locator('[class*="col-"], [class*="grid"], [class*="flex"]').count() > 0;
    console.log('是否有响应式布局:', hasResponsiveElements);

    // 检查可访问性属性
    const ariaElements = await page.locator('[aria-label], [aria-describedby], [role]').count();
    console.log('具有可访问性属性的元素数量:', ariaElements);

    // 获取页面主要文本内容
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('页面标题层级:', headings);

    // 检查颜色对比度（通过获取计算样式）
    const primaryButton = page.locator('button').first();
    if (await primaryButton.count() > 0) {
      const buttonStyles = await primaryButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize,
          padding: styles.padding
        };
      });
      console.log('主要按钮样式:', buttonStyles);
    }

    // 检查加载性能
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart
      };
    });
    console.log('页面加载性能:', performanceTiming);

    // 检查交互元素
    const clickableElements = await page.locator('a, button, [onclick], [role="button"]').count();
    console.log('可点击元素数量:', clickableElements);

    // 检查图片和图标
    const images = await page.locator('img, svg, [class*="icon"]').count();
    console.log('图片和图标数量:', images);

    // 测试键盘导航
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        className: el?.className,
        id: el?.id
      };
    });
    console.log('Tab键聚焦的第一个元素:', focusedElement);
  });
});