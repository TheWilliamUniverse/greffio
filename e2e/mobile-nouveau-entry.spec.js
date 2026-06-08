import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe('entrées Nouveau dossier (?new=1)', () => {
  test('questionnaire ?new=1 sans page blanche', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/questionnaire?new=1');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page).toHaveURL(/new=1/);
  });

  test('simulateur mobile sans page blanche', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/simulateur');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByText(/Que souhaitez-vous faire|Greffio|démarche/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('landing CTA démarche pointe vers parcours questionnaire', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    const nouveauLink = page.locator('a[href*="questionnaire"][href*="new=1"], a[href*="/simulateur"]').first();
    await expect(nouveauLink).toBeVisible({ timeout: 15_000 });
    const href = await nouveauLink.getAttribute('href');
    expect(href).toMatch(/questionnaire\?new=1|\/simulateur/);
  });
});
