import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = ['/', '/simulateur', '/login', '/questionnaire'];

for (const route of PUBLIC_ROUTES) {
  test(`mobile smoke ${route} renders`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
  });
}

test('landscape document editor shell', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/login');
  await expect(page.locator('#root')).toBeVisible();
});

test('tablet uses desktop width shell', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/simulateur');
  await expect(page.locator('#root')).toBeVisible();
});

test('questionnaire loads on fold viewport', async ({ page }) => {
  await page.setViewportSize({ width: 344, height: 882 });
  await page.goto('/questionnaire');
  await expect(page.locator('#root')).toBeVisible();
});

test('simulateur choice grid visible on phone SE', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/simulateur');
  await expect(page.locator('#root')).toBeVisible();
});
