import { test, expect } from '@playwright/test';

const hasAuthCredentials = Boolean(process.env.E2E_AUTH_EMAIL && process.env.E2E_AUTH_PASSWORD);

test.describe('authenticated cockpit smoke', () => {
  // Secrets CI : E2E_AUTH_EMAIL + E2E_AUTH_PASSWORD (GitHub Actions → repository secrets).
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

  test('boutique checkout page loads for authenticated user', async ({ page }) => {
    await page.goto('/boutique');
    await expect(page.locator('#root')).toBeVisible();
    const addButton = page.getByRole('button', { name: /ajouter|commander|panier/i }).first();
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
    }
    await page.goto('/boutique/checkout');
    await expect(page.getByText(/panier boutique|finaliser ma commande|options de paiement/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
