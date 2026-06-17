import { test, expect } from '@playwright/test';

const hasAuthCredentials = Boolean(process.env.E2E_AUTH_EMAIL && process.env.E2E_AUTH_PASSWORD);

test.describe('authenticated cockpit smoke', () => {
  test.skip(!hasAuthCredentials, 'Définir E2E_AUTH_EMAIL et E2E_AUTH_PASSWORD pour activer le smoke authentifié');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_AUTH_EMAIL);
    await page.getByLabel(/mot de passe/i).fill(process.env.E2E_AUTH_PASSWORD);
    await page.getByRole('button', { name: /connexion|accéder/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  });

  test('dashboard renders for authenticated user', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByRole('heading', { name: /cockpit greffio|bonjour/i })).toBeVisible();
  });

  test('mobile viewport dossiers and assistant documents', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/dashboard', '/dossiers', '/assistant-documents']) {
      await page.goto(path);
      await expect(page.locator('#root')).toBeVisible();
    }
  });
});
