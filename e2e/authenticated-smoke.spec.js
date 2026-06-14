import { test } from '@playwright/test';

/**
 * Smoke authentifié – structure préparée.
 * Décommenter et brancher E2E_AUTH_EMAIL / E2E_AUTH_PASSWORD quand les fixtures CI seront disponibles.
 */
test.describe.skip('authenticated cockpit smoke', () => {
  test.beforeEach(async ({ page }) => {
    // TODO(auth-fixtures): login via API ou storageState Playwright
    // await page.goto('/login');
    // await page.getByLabel(/email/i).fill(process.env.E2E_AUTH_EMAIL);
    // await page.getByLabel(/mot de passe/i).fill(process.env.E2E_AUTH_PASSWORD);
    // await page.getByRole('button', { name: /connexion|accéder/i }).click();
    // await page.waitForURL(/\/dashboard/);
    void page;
  });

  test('dashboard renders for authenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    // await expect(page.getByRole('heading', { name: /tableau de bord|accueil/i })).toBeVisible();
  });

  test('mobile viewport dossiers and documents', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/dashboard', '/dossiers', '/documents']) {
      await page.goto(path);
      // await expect(page.locator('#root')).toBeVisible();
    }
  });
});
