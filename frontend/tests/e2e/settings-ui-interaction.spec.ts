import { test, expect } from '@playwright/test'

test.describe('设置页面交互测试', () => {
  test('测试登录和注册切换', async ({ page }) => {
    // 访问设置页面
    await page.goto('http://localhost:5174/settings', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // 等待页面加载
    await page.waitForTimeout(1000)

    // 1. 测试标签切换
    const registerTab = page.locator('text=注册')
    await registerTab.click()

    // 截图注册表单
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-register-form.png',
      fullPage: true
    })

    // 切换回登录
    const loginTab = page.locator('text=登录').first()
    await loginTab.click()

    // 2. 测试密码输入框的显示/隐藏功能
    const passwordInput = page.locator('input[type="password"]').first()
    const passwordToggle = page.locator('[aria-label*="eye"], [class*="eye"]').first()

    if (await passwordToggle.isVisible()) {
      await passwordToggle.click()
      await page.screenshot({
        path: 'tests/e2e/screenshots/settings-password-visible.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
    }

    // 3. 测试表单验证
    const loginButton = page.locator('button:has-text("登录")')
    await loginButton.click()

    // 等待错误信息
    await page.waitForTimeout(500)

    // 截图错误状态
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-validation-errors.png',
      fullPage: true
    })

    // 4. 测试系统信息卡片的复制功能
    const copyButton = page.locator('[aria-label*="copy"], [class*="copy"]').first()
    if (await copyButton.isVisible()) {
      await copyButton.click()
      await page.waitForTimeout(500)

      // 截图复制反馈
      await page.screenshot({
        path: 'tests/e2e/screenshots/settings-copy-feedback.png',
        clip: { x: 700, y: 100, width: 500, height: 400 }
      })
    }

    // 5. 测试焦点状态
    await page.locator('input').first().focus()
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-input-focus.png',
      clip: { x: 200, y: 200, width: 600, height: 400 }
    })

    // 6. 测试键盘导航
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.screenshot({
      path: 'tests/e2e/screenshots/settings-keyboard-nav.png',
      clip: { x: 200, y: 200, width: 600, height: 400 }
    })
  })

  test('测试响应式布局', async ({ page }) => {
    await page.goto('http://localhost:5174/settings', {
      waitUntil: 'networkidle'
    })

    // 测试不同断点
    const breakpoints = [
      { name: 'mobile-xs', width: 320, height: 568 },
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'desktop-xl', width: 1920, height: 1080 }
    ]

    for (const bp of breakpoints) {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await page.waitForTimeout(500)
      await page.screenshot({
        path: `tests/e2e/screenshots/settings-${bp.name}.png`,
        fullPage: false
      })
    }
  })
})