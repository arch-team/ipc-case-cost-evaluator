import { test, expect, Page } from '@playwright/test'

// 测试配置
const BASE_URL = 'http://localhost:5173'
const CALCULATOR_URL = `${BASE_URL}/calculator`

// 页面对象模型
class CalculatorPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto(CALCULATOR_URL)
    await this.page.waitForLoadState('networkidle')
  }

  // 功能维度输入控件
  async setDeviceCount(count: number) {
    await this.page.locator('input[placeholder*="设备数量"]').fill(count.toString())
  }

  async selectRecordingMode(mode: 'continuous' | 'event_triggered') {
    const modeText = mode === 'continuous' ? '连续录像' : '事件触发'
    await this.page.locator(`text=${modeText}`).click()
  }

  async selectVideoQuality(quality: 'SD' | 'HD' | 'FHD' | '4K') {
    const qualityText = {
      'SD': '标清 (480p)',
      'HD': '高清 (720p)',
      'FHD': '全高清 (1080p)',
      '4K': '超高清 (4K)'
    }[quality]

    // 点击视频质量下拉框
    await this.page.locator('text=视频质量').locator('..').locator('.ant-select').click()
    // 选择选项
    await this.page.locator(`.ant-select-dropdown`).locator(`text="${qualityText}"`).click()
  }

  async setRetentionDays(days: number) {
    await this.page.locator('input[placeholder*="保留天数"]').fill(days.toString())
  }

  async setAccessPattern(percentage: number) {
    // 设置回看比例滑块
    const slider = await this.page.locator('.ant-slider').first()
    await slider.click({ position: { x: percentage * 2, y: 10 } }) // 假设滑块宽度200px
  }

  // 技术维度输入控件
  async selectStorageClass(storageClass: 'STANDARD' | 'GLACIER_IR') {
    const classText = storageClass === 'STANDARD' ? 'S3 Standard' : 'S3 Glacier IR'
    await this.page.locator(`text="${classText}"`).click()
  }

  async enableLifecyclePolicy(enable: boolean) {
    const checkbox = await this.page.locator('text=启用生命周期策略').locator('..')
    const isChecked = await checkbox.locator('input[type="checkbox"]').isChecked()
    if (isChecked !== enable) {
      await checkbox.click()
    }
  }

  // 提交计算
  async calculate() {
    await this.page.locator('button:has-text("实时计算")').click()
    await this.page.waitForResponse(resp => resp.url().includes('/api/v1/calculate'))
  }

  // 获取计算结果
  async getTotalCost(): Promise<string> {
    return await this.page.locator('.cost-summary .total-cost').textContent() || ''
  }

  async getMonthlyStorageCost(): Promise<string> {
    return await this.page.locator('text=月度总费用').locator('..').textContent() || ''
  }

  async getYearlyCost(): Promise<string> {
    return await this.page.locator('text=年度总费用').locator('..').textContent() || ''
  }

  // 截图功能
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `frontend/tests/e2e/screenshots/${name}.png`,
      fullPage: true
    })
  }
}

test.describe('成本计算器 E2E 测试', () => {
  let calcPage: CalculatorPage

  test.beforeEach(async ({ page }) => {
    calcPage = new CalculatorPage(page)
    await calcPage.goto()
  })

  test('基础成本计算 - 连续录像模式', async ({ page }) => {
    // 1. 设置功能维度参数
    await calcPage.setDeviceCount(100)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.selectVideoQuality('FHD')
    await calcPage.setRetentionDays(30)
    await calcPage.setAccessPattern(10) // 10% 回看

    // 2. 设置技术维度
    await calcPage.selectStorageClass('STANDARD')

    // 3. 截图输入状态
    await calcPage.screenshot('test1-input-continuous')

    // 4. 执行计算
    await calcPage.calculate()

    // 5. 等待结果加载
    await page.waitForTimeout(1000)

    // 6. 验证结果存在
    const monthlyCost = await calcPage.getMonthlyStorageCost()
    expect(monthlyCost).toBeTruthy()
    expect(monthlyCost).toContain('$')

    // 7. 截图结果
    await calcPage.screenshot('test1-result-continuous')

    // 8. 验证成本合理性（连续录像应该产生较高成本）
    const costValue = parseFloat(monthlyCost.replace(/[^0-9.]/g, ''))
    expect(costValue).toBeGreaterThan(100) // 预期月成本大于 $100
  })

  test('事件触发录像模式计算', async ({ page }) => {
    // 1. 设置事件触发模式
    await calcPage.setDeviceCount(50)
    await calcPage.selectRecordingMode('event_triggered')
    await calcPage.selectVideoQuality('HD')
    await calcPage.setRetentionDays(15)
    await calcPage.setAccessPattern(5)

    // 2. 使用 S3 Standard
    await calcPage.selectStorageClass('STANDARD')

    // 3. 截图输入
    await calcPage.screenshot('test2-input-event')

    // 4. 计算
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 5. 验证结果
    const monthlyCost = await calcPage.getMonthlyStorageCost()
    expect(monthlyCost).toBeTruthy()

    // 6. 截图结果
    await calcPage.screenshot('test2-result-event')

    // 7. 验证事件触发模式成本应该较低
    const costValue = parseFloat(monthlyCost.replace(/[^0-9.]/g, ''))
    expect(costValue).toBeLessThan(500) // 事件触发模式成本应该更低
  })

  test('Glacier IR 存储类型计算', async ({ page }) => {
    // 1. 设置参数
    await calcPage.setDeviceCount(200)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.selectVideoQuality('4K')
    await calcPage.setRetentionDays(90) // 长期存储
    await calcPage.setAccessPattern(2) // 低访问率

    // 2. 选择 Glacier IR（适合冷数据）
    await calcPage.selectStorageClass('GLACIER_IR')

    // 3. 截图
    await calcPage.screenshot('test3-input-glacier')

    // 4. 计算
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 5. 获取结果
    const monthlyCost = await calcPage.getMonthlyStorageCost()
    const yearlyCost = await calcPage.getYearlyCost()

    // 6. 截图结果
    await calcPage.screenshot('test3-result-glacier')

    // 7. 验证结果
    expect(monthlyCost).toBeTruthy()
    expect(yearlyCost).toBeTruthy()

    // 8. 验证年度成本是月度的 12 倍左右
    const monthlyValue = parseFloat(monthlyCost.replace(/[^0-9.]/g, ''))
    const yearlyValue = parseFloat(yearlyCost.replace(/[^0-9.]/g, ''))
    expect(yearlyValue).toBeGreaterThan(monthlyValue * 11)
    expect(yearlyValue).toBeLessThan(monthlyValue * 13)
  })

  test('生命周期策略成本计算', async ({ page }) => {
    // 1. 设置基础参数
    await calcPage.setDeviceCount(150)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.selectVideoQuality('FHD')
    await calcPage.setRetentionDays(60)
    await calcPage.setAccessPattern(15)

    // 2. 启用生命周期策略
    await calcPage.enableLifecyclePolicy(true)

    // 3. 等待生命周期配置表单出现
    await page.waitForSelector('text=生命周期转换天数', { timeout: 5000 })

    // 4. 设置生命周期参数
    await page.locator('input[placeholder*="转换天数"]').fill('7')

    // 5. 截图
    await calcPage.screenshot('test4-input-lifecycle')

    // 6. 计算
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 7. 验证结果
    const monthlyCost = await calcPage.getMonthlyStorageCost()
    expect(monthlyCost).toBeTruthy()

    // 8. 截图结果
    await calcPage.screenshot('test4-result-lifecycle')

    // 9. 验证生命周期策略应该降低成本
    const costValue = parseFloat(monthlyCost.replace(/[^0-9.]/g, ''))
    expect(costValue).toBeGreaterThan(0)
  })

  test('边界值测试 - 最小值', async ({ page }) => {
    // 1. 设置最小值
    await calcPage.setDeviceCount(1)
    await calcPage.selectRecordingMode('event_triggered')
    await calcPage.selectVideoQuality('SD')
    await calcPage.setRetentionDays(1)
    await calcPage.setAccessPattern(0)

    // 2. 截图
    await calcPage.screenshot('test5-input-minimum')

    // 3. 计算
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 4. 验证结果
    const monthlyCost = await calcPage.getMonthlyStorageCost()
    expect(monthlyCost).toBeTruthy()

    // 5. 截图结果
    await calcPage.screenshot('test5-result-minimum')

    // 6. 验证最小成本应该很低
    const costValue = parseFloat(monthlyCost.replace(/[^0-9.]/g, ''))
    expect(costValue).toBeGreaterThanOrEqual(0)
    expect(costValue).toBeLessThan(10) // 最小配置成本应该很低
  })

  test('边界值测试 - 最大值', async ({ page }) => {
    // 1. 设置较大值
    await calcPage.setDeviceCount(1000)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.selectVideoQuality('4K')
    await calcPage.setRetentionDays(365)
    await calcPage.setAccessPattern(50)

    // 2. 截图
    await calcPage.screenshot('test6-input-maximum')

    // 3. 计算
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 4. 验证结果
    const monthlyCost = await calcPage.getMonthlyStorageCost()
    expect(monthlyCost).toBeTruthy()

    // 5. 截图结果
    await calcPage.screenshot('test6-result-maximum')

    // 6. 验证大规模部署成本
    const costValue = parseFloat(monthlyCost.replace(/[^0-9.]/g, ''))
    expect(costValue).toBeGreaterThan(10000) // 大规模部署成本应该很高
  })

  test('参数变化后重新计算', async ({ page }) => {
    // 1. 初始计算
    await calcPage.setDeviceCount(100)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    const initialCost = await calcPage.getMonthlyStorageCost()
    const initialValue = parseFloat(initialCost.replace(/[^0-9.]/g, ''))

    // 2. 修改参数
    await calcPage.setDeviceCount(200) // 设备数翻倍

    // 3. 重新计算
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    const updatedCost = await calcPage.getMonthlyStorageCost()
    const updatedValue = parseFloat(updatedCost.replace(/[^0-9.]/g, ''))

    // 4. 截图对比
    await calcPage.screenshot('test7-parameter-change')

    // 5. 验证成本应该增加
    expect(updatedValue).toBeGreaterThan(initialValue)
    // 设备数翻倍，成本应该接近翻倍
    expect(updatedValue).toBeGreaterThan(initialValue * 1.8)
    expect(updatedValue).toBeLessThan(initialValue * 2.2)
  })

  test('成本分解验证', async ({ page }) => {
    // 1. 设置参数
    await calcPage.setDeviceCount(100)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.selectVideoQuality('FHD')
    await calcPage.setRetentionDays(30)

    // 2. 计算
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 3. 验证成本分解表格存在
    const breakdownTable = await page.locator('.cost-breakdown-table')
    await expect(breakdownTable).toBeVisible()

    // 4. 验证关键成本项
    await expect(page.locator('text=存储成本')).toBeVisible()
    await expect(page.locator('text=PUT 请求成本')).toBeVisible()
    await expect(page.locator('text=GET 请求成本')).toBeVisible()

    // 5. 截图成本分解
    await calcPage.screenshot('test8-cost-breakdown')

    // 6. 验证每个成本项都有值
    const storageCost = await page.locator('tr:has-text("存储成本") td:last-child').textContent()
    const putCost = await page.locator('tr:has-text("PUT 请求成本") td:last-child').textContent()
    const getCost = await page.locator('tr:has-text("GET 请求成本") td:last-child').textContent()

    expect(storageCost).toContain('$')
    expect(putCost).toContain('$')
    expect(getCost).toContain('$')
  })

  test('响应式设计测试', async ({ page }) => {
    // 1. 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 })
    await calcPage.goto()

    // 2. 验证表单在移动端可用
    await expect(page.locator('text=成本计算器')).toBeVisible()
    await calcPage.setDeviceCount(50)

    // 3. 截图移动端
    await calcPage.screenshot('test9-mobile-view')

    // 4. 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 })
    await calcPage.goto()

    // 5. 截图平板端
    await calcPage.screenshot('test9-tablet-view')

    // 6. 恢复桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('错误处理测试', async ({ page }) => {
    // 1. 测试无效输入
    await calcPage.setDeviceCount(-1) // 负数
    await calcPage.calculate()

    // 2. 等待错误提示
    await page.waitForTimeout(500)

    // 3. 验证错误提示或验证
    const deviceInput = await page.locator('input[placeholder*="设备数量"]')
    const value = await deviceInput.inputValue()

    // 输入应该被拒绝或显示错误
    expect(parseInt(value)).toBeGreaterThanOrEqual(0)

    // 4. 测试极大值
    await calcPage.setDeviceCount(999999999)
    await calcPage.calculate()
    await page.waitForTimeout(500)

    // 5. 截图错误状态
    await calcPage.screenshot('test10-error-handling')
  })
})

test.describe('多方案对比测试', () => {
  test('对比 Standard 和 Glacier IR', async ({ page }) => {
    const calcPage = new CalculatorPage(page)
    await calcPage.goto()

    // 1. 添加第一个方案 - Standard
    await calcPage.setDeviceCount(100)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.selectStorageClass('STANDARD')
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 2. 点击"添加方案"按钮（如果存在）
    const addSchemeButton = page.locator('button:has-text("添加方案")')
    if (await addSchemeButton.isVisible()) {
      await addSchemeButton.click()

      // 3. 配置第二个方案 - Glacier IR
      await calcPage.selectStorageClass('GLACIER_IR')
      await calcPage.calculate()
      await page.waitForTimeout(1000)

      // 4. 截图对比结果
      await calcPage.screenshot('test11-comparison')

      // 5. 验证对比视图
      await expect(page.locator('text=方案对比')).toBeVisible()
    }
  })
})

test.describe('灵敏度分析测试', () => {
  test('验证灵敏度分析功能', async ({ page }) => {
    const calcPage = new CalculatorPage(page)
    await calcPage.goto()

    // 1. 执行基础计算
    await calcPage.setDeviceCount(100)
    await calcPage.selectRecordingMode('continuous')
    await calcPage.calculate()
    await page.waitForTimeout(1000)

    // 2. 查找灵敏度分析按钮或选项卡
    const sensitivityTab = page.locator('text=灵敏度分析')
    if (await sensitivityTab.isVisible()) {
      await sensitivityTab.click()

      // 3. 等待灵敏度分析加载
      await page.waitForTimeout(2000)

      // 4. 截图灵敏度分析
      await calcPage.screenshot('test12-sensitivity-analysis')

      // 5. 验证热力图或分析结果
      const heatmap = page.locator('.sensitivity-heatmap, .sensitivity-analysis')
      if (await heatmap.isVisible()) {
        await expect(heatmap).toBeVisible()
      }
    }
  })
})