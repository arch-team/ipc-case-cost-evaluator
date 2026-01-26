import { test, expect } from '@playwright/test'

test.describe('设置页面 UX/UI 分析', () => {
  test('访问设置页面并进行视觉分析', async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(60000)

    // 1. 访问设置页面
    await page.goto('http://localhost:5174/settings', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // 等待页面完全加载
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')

    // 等待一下确保所有样式都加载完成
    await page.waitForTimeout(2000)

    // 2. 截取整个页面的截图
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-page-full.png',
      fullPage: true
    })

    // 3. 截取视口内的截图
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-page-viewport.png',
      fullPage: false
    })

    // 4. 分析页面元素
    const pageTitle = await page.title()
    console.log('页面标题:', pageTitle)

    // 检查主要UI元素
    const elements = {
      // 查找导航菜单
      navigation: await page.locator('[class*="menu"], [class*="nav"], nav').count(),
      // 查找表单元素
      forms: await page.locator('form').count(),
      inputs: await page.locator('input').count(),
      buttons: await page.locator('button').count(),
      selects: await page.locator('select').count(),
      // 查找卡片或面板
      cards: await page.locator('[class*="card"], [class*="panel"]').count(),
      // 查找标题
      headings: {
        h1: await page.locator('h1').count(),
        h2: await page.locator('h2').count(),
        h3: await page.locator('h3').count(),
      },
      // 查找表格
      tables: await page.locator('table').count(),
      // 查找Ant Design组件
      antdForms: await page.locator('.ant-form').count(),
      antdCards: await page.locator('.ant-card').count(),
      antdTabs: await page.locator('.ant-tabs').count(),
    }

    console.log('页面元素统计:', JSON.stringify(elements, null, 2))

    // 5. 获取页面的可访问性树
    const accessibilityTree = await page.accessibility.snapshot()
    console.log('可访问性树深度:', accessibilityTree ? JSON.stringify(accessibilityTree).length : 0)

    // 6. 检查响应式设计 - 移动端视图
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-page-mobile.png',
      fullPage: false
    })

    // 7. 检查响应式设计 - 平板视图
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-page-tablet.png',
      fullPage: false
    })

    // 8. 恢复桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(1000)

    // 9. 分析颜色对比度（通过获取计算样式）
    const bodyStyles = await page.evaluate(() => {
      const body = document.body
      const computedStyle = window.getComputedStyle(body)
      return {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
      }
    })
    console.log('页面基础样式:', bodyStyles)

    // 10. 检查页面性能指标
    const metrics = await page.evaluate(() => {
      const perf = window.performance.timing
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.navigationStart,
        loadComplete: perf.loadEventEnd - perf.navigationStart,
      }
    })
    console.log('性能指标 (ms):', metrics)

    // 11. 获取页面文本内容用于分析
    const pageText = await page.textContent('body')
    console.log('页面文本长度:', pageText?.length || 0)

    // 12. 检查是否有错误信息
    const errors = await page.locator('[class*="error"], [class*="alert"], [class*="warning"]').count()
    console.log('错误/警告元素数量:', errors)

    // 验证页面加载成功
    expect(page.url()).toContain('/settings')
  })
})