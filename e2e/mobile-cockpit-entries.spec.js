import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe('mobile cockpit entries', () => {
  test('landing mobile hero renders', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByText(/Greffio|formalit/i).first()).toBeVisible();
  });

  test('login route resolves without white page', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/login');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('app install page loads on phone', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/app');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByText(/Greffio|application/i).first()).toBeVisible();
  });

  test('simulateur shell renders on phone', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/simulateur');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByText(/Greffio|simulateur|questionnaire/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('chat route resolves without white page', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/chat');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('statuts route resolves without white page', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/statuts');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
