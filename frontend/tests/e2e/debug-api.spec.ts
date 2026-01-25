/**
 * API 调试测试
 */
import { test, expect } from '@playwright/test';

test('调试 API 请求', async ({ page }) => {
  // 监听所有网络请求
  const requests: string[] = [];
  const responses: { url: string; status: number }[] = [];

  page.on('request', req => {
    requests.push(req.url());
  });

  page.on('response', resp => {
    responses.push({ url: resp.url(), status: resp.status() });
  });

  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });

  // 导航到计算器页面
  await page.goto('/calculator');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // 打印所有请求
  console.log('\n=== 网络请求 ===');
  for (const req of requests) {
    console.log('Request:', req);
  }

  console.log('\n=== 网络响应 ===');
  for (const resp of responses) {
    console.log('Response:', resp.url, '-', resp.status);
  }

  // 检查是否有 scenarios API 请求
  const scenariosRequests = requests.filter(r => r.includes('scenarios'));
  console.log('\n=== Scenarios API 请求 ===');
  console.log('数量:', scenariosRequests.length);
  for (const req of scenariosRequests) {
    console.log('  -', req);
  }

  // 截图
  await page.screenshot({ path: 'debug-screenshot.png' });

  expect(true).toBe(true);
});
