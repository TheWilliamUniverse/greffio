import { test, expect } from '@playwright/test';

const DOSSIER_ID = 'e2e-sasu-payment';
const MOBILE_VIEWPORT = { width: 390, height: 844 };

const mockPaidVerification = async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      status: 'paid',
      dossierStatus: 'payment_confirmed',
      resolved: true,
    }),
  });
};

test.describe('parcours SASU – retour paiement mocké', () => {
  test('retour Mollie mocké affiche paiement confirmé', async ({ page }) => {
    await page.route(/\/api\/payments\/verification\/status/, mockPaidVerification);

    await page.goto(`/paiement/verification?dossierId=${DOSSIER_ID}&molliePaymentId=tr_e2e_mock&status=paid`);
    await expect(page.getByRole('heading', { name: /Paiement confirmé/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: /Voir le dossier/i })).toBeVisible();
  });

  test('retour mobile viewport affiche paiement confirmé', async ({ page }) => {
    await page.route(/\/api\/payments\/verification\/status/, mockPaidVerification);

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/paiement/verification?dossierId=${DOSSIER_ID}&molliePaymentId=tr_e2e_mock_mobile&status=paid`);
    await expect(page.getByRole('heading', { name: /Paiement confirmé/i })).toBeVisible({ timeout: 20_000 });
  });
});
