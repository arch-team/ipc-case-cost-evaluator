/**
 * 管理页面 Page Object
 */
import { Page, Locator } from '@playwright/test';

export class AdminPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly userTable: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly addUserButton: Locator;
  readonly userRows: Locator;
  readonly loadingIndicator: Locator;
  readonly pagination: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1, .page-title, .ant-page-header-heading-title').filter({ hasText: /用户管理|User Management|管理/i });
    this.userTable = page.locator('.ant-table, .user-table, table');
    this.searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="Search"], .ant-input-search input');
    this.searchButton = page.locator('button').filter({ hasText: /搜索|Search/i });
    this.addUserButton = page.locator('button').filter({ hasText: /添加用户|Add User|新增/i });
    this.userRows = page.locator('.ant-table-tbody tr, tbody tr').filter({ hasNot: page.locator('.ant-table-placeholder') });
    this.loadingIndicator = page.locator('.ant-spin, .loading, [data-testid="loading"]');
    this.pagination = page.locator('.ant-pagination');
    this.refreshButton = page.locator('button').filter({ hasText: /刷新|Refresh/i });
  }

  async goto() {
    await this.page.goto('/admin');
    await this.waitForPageLoad();
  }

  async gotoDirectly() {
    // 直接访问管理页面，可能会被重定向到登录页
    await this.page.goto('/admin', { waitUntil: 'networkidle' });
  }

  async waitForPageLoad() {
    // 等待页面加载完成
    await this.page.waitForLoadState('networkidle');

    // 等待加载指示器消失
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      console.log('加载指示器未出现或已隐藏');
    });

    // 等待表格出现
    await this.userTable.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('用户表格未出现');
    });
  }

  async searchUser(keyword: string) {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill(keyword);

    // 尝试点击搜索按钮或按回车
    const searchBtn = this.searchButton.first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
    } else {
      await this.searchInput.press('Enter');
    }

    // 等待搜索结果
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/v1/users') || resp.url().includes('/users/search'),
      { timeout: 5000 }
    ).catch(() => {
      console.log('搜索 API 响应未检测到');
    });

    await this.waitForPageLoad();
  }

  async getUserCount(): Promise<number> {
    await this.waitForPageLoad();
    const rows = await this.userRows.all();
    return rows.length;
  }

  async getUserByEmail(email: string): Promise<Locator | null> {
    const userRow = this.userRows.filter({ hasText: email }).first();
    if (await userRow.isVisible()) {
      return userRow;
    }
    return null;
  }

  async getUserRole(email: string): Promise<string | null> {
    const userRow = await this.getUserByEmail(email);
    if (!userRow) return null;

    // 查找角色单元格（通常在邮箱后面的列）
    const roleCell = userRow.locator('td').filter({ hasText: /admin|user|viewer|管理员|用户|查看者/i }).first();
    if (await roleCell.isVisible()) {
      return await roleCell.textContent();
    }
    return null;
  }

  async clickUserAction(email: string, action: '编辑' | '删除' | '查看' | 'Edit' | 'Delete' | 'View') {
    const userRow = await this.getUserByEmail(email);
    if (!userRow) {
      throw new Error(`未找到用户: ${email}`);
    }

    // 查找操作按钮
    const actionButton = userRow.locator('button, a').filter({ hasText: new RegExp(action, 'i') }).first();
    if (await actionButton.isVisible()) {
      await actionButton.click();
    } else {
      // 如果没有直接的按钮，尝试查找下拉菜单
      const moreButton = userRow.locator('.ant-dropdown-trigger, button').filter({ hasText: /更多|More|⋯/i }).first();
      if (await moreButton.isVisible()) {
        await moreButton.click();
        await this.page.locator(`.ant-dropdown-menu-item, .ant-menu-item`).filter({ hasText: new RegExp(action, 'i') }).first().click();
      }
    }
  }

  async editUserRole(email: string, newRole: string) {
    await this.clickUserAction(email, '编辑');

    // 等待编辑模态框或表单
    const modal = this.page.locator('.ant-modal, .edit-modal, [role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // 选择新角色
    const roleSelect = modal.locator('.ant-select, select').filter({ has: this.page.locator('text=/角色|Role/i') });
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      await this.page.locator('.ant-select-dropdown-menu-item, .ant-select-item').filter({ hasText: newRole }).click();
    }

    // 保存更改
    const saveButton = modal.locator('button').filter({ hasText: /保存|Save|确定|OK/i });
    await saveButton.click();

    // 等待保存完成
    await modal.waitFor({ state: 'hidden', timeout: 5000 });
    await this.waitForPageLoad();
  }

  async deleteUser(email: string) {
    await this.clickUserAction(email, '删除');

    // 确认删除
    const confirmButton = this.page.locator('.ant-modal-confirm button, .ant-popconfirm button').filter({ hasText: /确定|Yes|删除|Delete/i });
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // 等待删除完成
    await this.page.waitForResponse(
      resp => resp.url().includes('/api/v1/users') && resp.request().method() === 'DELETE',
      { timeout: 5000 }
    ).catch(() => {
      console.log('删除 API 响应未检测到');
    });

    await this.waitForPageLoad();
  }

  async isPageAccessible(): Promise<boolean> {
    try {
      // 检查是否在管理页面
      const url = this.page.url();
      if (url.includes('/admin')) {
        // 检查是否有管理页面的标识元素
        const hasAdminElements = await Promise.race([
          this.pageTitle.isVisible(),
          this.userTable.isVisible(),
          this.page.locator('text=/用户管理|User Management/i').isVisible()
        ]);
        return hasAdminElements;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getPaginationInfo(): Promise<{ current: number; total: number; pageSize: number } | null> {
    try {
      if (await this.pagination.isVisible()) {
        const paginationText = await this.pagination.textContent();
        // 解析分页信息，例如 "1-10 of 50"
        const match = paginationText?.match(/(\d+)-(\d+)\s+of\s+(\d+)/i);
        if (match) {
          const [, start, end, total] = match;
          const pageSize = parseInt(end) - parseInt(start) + 1;
          const current = Math.ceil(parseInt(start) / pageSize);
          return {
            current,
            total: parseInt(total),
            pageSize
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async nextPage() {
    const nextButton = this.pagination.locator('.ant-pagination-next, button').filter({ hasText: /下一页|Next/i });
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await this.waitForPageLoad();
    }
  }

  async previousPage() {
    const prevButton = this.pagination.locator('.ant-pagination-prev, button').filter({ hasText: /上一页|Previous/i });
    if (await prevButton.isEnabled()) {
      await prevButton.click();
      await this.waitForPageLoad();
    }
  }

  async goToPage(pageNumber: number) {
    const pageButton = this.pagination.locator(`.ant-pagination-item`).filter({ hasText: pageNumber.toString() });
    if (await pageButton.isVisible()) {
      await pageButton.click();
      await this.waitForPageLoad();
    }
  }

  async refreshUserList() {
    if (await this.refreshButton.isVisible()) {
      await this.refreshButton.click();
    } else {
      // 如果没有刷新按钮，重新加载页面
      await this.page.reload();
    }
    await this.waitForPageLoad();
  }
}