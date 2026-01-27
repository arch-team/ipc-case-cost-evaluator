/**
 * 登录页面 Page Object
 */
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input#email, input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], input#password, input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]').filter({ hasText: /登录|Login/i });
    this.errorMessage = page.locator('.ant-alert-error, .ant-message-error, .error-message');
    this.loginForm = page.locator('form, .login-form, .ant-form');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    // 等待表单加载
    await this.loginForm.waitFor({ state: 'visible', timeout: 10000 });

    // 填写邮箱
    await this.emailInput.waitFor({ state: 'visible' });
    await this.emailInput.fill(email);

    // 填写密码
    await this.passwordInput.waitFor({ state: 'visible' });
    await this.passwordInput.fill(password);

    // 提交表单
    await this.submitButton.waitFor({ state: 'visible' });
    await this.submitButton.click();

    // 等待响应
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/v1/auth/login') || resp.url().includes('/auth/login'),
      { timeout: 10000 }
    ).catch(() => {
      // 如果没有找到登录 API，继续执行
      console.log('未检测到登录 API 调用，可能已经登录或使用其他端点');
    });
  }

  async waitForLoginSuccess() {
    // 等待登录成功后的跳转或用户信息显示
    await Promise.race([
      this.page.waitForURL('**/admin/**', { timeout: 10000 }),
      this.page.waitForURL('**/dashboard/**', { timeout: 10000 }),
      this.page.locator('.user-info, .ant-avatar, [data-testid="user-menu"]').waitFor({ state: 'visible', timeout: 10000 })
    ]).catch(() => {
      console.log('等待登录成功标识');
    });
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      // 检查是否有用户信息或已登录标识
      const userIndicators = await Promise.race([
        this.page.locator('.user-info, .ant-avatar').isVisible(),
        this.page.locator('[data-testid="user-menu"]').isVisible(),
        this.page.locator('.logout-button, .logout-btn').isVisible()
      ]);
      return userIndicators;
    } catch {
      return false;
    }
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }
}