import { test, expect } from '@playwright/test';
import { COOKIE_CONSENT_KEY } from '../src/config/cookieCatalog.js';

test.describe('simulateur desktop – sélection forme juridique', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.addInitScript((consentKey) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(consentKey, JSON.stringify({
        essential: true,
        functional: true,
        analytics: false,
        marketing: false,
        decidedAt: new Date().toISOString(),
      }));
    }, COOKIE_CONSENT_KEY);
  });

  const dismissCookieBanner = async (page) => {
    const refuse = page.getByRole('button', { name: /Refuser le non essentiel/i });
    if (await refuse.isVisible({ timeout: 1500 }).catch(() => false)) {
      await refuse.click();
      return;
    }
    const accept = page.getByRole('button', { name: /Accepter tout/i });
    if (await accept.isVisible({ timeout: 500 }).catch(() => false)) {
      await accept.click();
    }
  };

  const tapContinue = async (page) => {
    await dismissCookieBanner(page);
    const btn = page.getByRole('button', { name: /continuer|question suivante/i });
    await expect(btn).toBeEnabled({ timeout: 10_000 });
    await btn.click();
  };

  const fillVisibleContactFields = async (page) => {
    while (
      !(await page.getByPlaceholder('Votre prénom').isVisible().catch(() => false))
      && (await page.getByRole('heading', { name: 'Vos coordonnées' }).isVisible().catch(() => false))
    ) {
      const back = page.getByRole('button', { name: /^Retour$/i });
      if (!(await back.isEnabled().catch(() => false))) break;
      await back.click();
    }

    const contactFields = [
      ['Votre prénom', 'Jean'],
      ['Votre nom', 'Dupont'],
      ['vous@entreprise.fr', 'jean.dupont@example.com'],
      ['04 11 81 86 70', '0601020304'],
    ];
    for (const [placeholder, value] of contactFields) {
      const input = page.getByPlaceholder(placeholder);
      await expect(input).toBeVisible({ timeout: 10_000 });
      await input.fill(value);
      await tapContinue(page);
    }
  };

  test('affiche Continuer après sélection SAS et avance', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/simulateur?type=statuts');
    await expect(page.getByText('Que souhaitez-vous faire ?')).toBeVisible({ timeout: 20_000 });
    await dismissCookieBanner(page);
    await page.getByRole('radio', { name: /Générer mes statuts/i }).click();

    await expect(page.getByRole('heading', { name: 'Vos coordonnées' })).toBeVisible({ timeout: 15_000 });
    await fillVisibleContactFields(page);

    await expect(page.getByRole('heading', { name: /qui effectue la démarche/i })).toBeVisible({ timeout: 15_000 });
    await page.locator('select').first().selectOption('personne_physique');
    await page.locator('div.md\\:grid-cols-2 input').first().fill('Jean Dupont');
    await tapContinue(page);

    await page.getByRole('radio', { name: /Sociétés commerciales|Les plus courantes/i }).first().click();
    await expect(page.getByRole('heading', { name: /choisissez votre forme juridique/i })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('radio', { name: /^SAS\b/i }).first().click();

    const continueBtn = page.getByRole('button', { name: /^Continuer$/i });
    await expect(continueBtn).toBeVisible();
    await expect(continueBtn).toBeEnabled();
    await dismissCookieBanner(page);
    await continueBtn.click();

    await expect(page.getByText(/délai souhaité|nom envisagé|dénomination/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
