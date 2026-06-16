import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const tapNextQuestion = async (page) => {
  await page.getByRole('button', { name: 'Question suivante' }).click();
};

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe('simulateur mobile – flux unifié tap-to-advance', () => {
  test('démarche → coordonnées sans écran création de compte', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/simulateur?type=creation');
    await expect(page.getByText('Que souhaitez-vous faire ?')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('radio', { name: /Créer une entreprise/i }).click();
    await expect(page.getByText(/Prénom|Vos coordonnées/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Créez votre espace Greffio/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Continuer$/i })).toHaveCount(0);

    await page.locator('#simulator-contact-firstName').fill('Jean');
    await tapNextQuestion(page);
    await expect(page.locator('#simulator-contact-lastName')).toBeVisible({ timeout: 10_000 });
  });

  test('choix forme juridique sans bouton Continuer visible', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/simulateur?type=statuts');
    await expect(page.getByText('Que souhaitez-vous faire ?')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('radio', { name: /Générer mes statuts/i }).click();

    await page.locator('#simulator-contact-firstName').fill('Marie');
    await tapNextQuestion(page);
    await page.locator('#simulator-contact-lastName').fill('Martin');
    await tapNextQuestion(page);
    await page.locator('#simulator-contact-email').fill('marie@example.com');
    await tapNextQuestion(page);
    await page.locator('#simulator-contact-phone').fill('0601020304');
    await tapNextQuestion(page);

    await page.getByRole('radio', { name: /Personne physique/i }).click();
    await expect(page.locator('#simulator-initiator-initiatorName')).toBeVisible({ timeout: 10_000 });

    await page.locator('#simulator-initiator-initiatorName').fill('Marie Martin');
    await tapNextQuestion(page);

    await expect(page.getByText('Choisissez votre forme juridique')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Continuer$/i })).toHaveCount(0);
    await page.getByRole('radio', { name: /^SASU\b/i }).first().click();
    await expect(page.getByText(/Délai souhaité|Nom envisagé/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
