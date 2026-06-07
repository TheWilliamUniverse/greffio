import { test, expect } from '@playwright/test';

const assertNoWhitePage = async (page) => {
  await expect(page.locator('#root')).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text.trim().length).toBeGreaterThan(20);
  await expect(page.locator('h1, h2').first()).toBeVisible();
};

const routes = [
  { name: 'landing', path: '/' },
  { name: 'tarifs', path: '/tarifs' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'simulateur', path: '/simulateur' },
  { name: 'guide', path: '/guide' },
  { name: 'contact', path: '/contact' },
  { name: 'mentions', path: '/mentions-legales' },
  { name: 'cookies', path: '/cookies' },
  { name: 'confidentialite', path: '/confidentialite' },
  { name: 'suppression-compte', path: '/suppression-compte' },
  { name: 'suppression-donnees', path: '/suppression-donnees' },
  { name: 'app', path: '/app' },
  { name: 'paiement', path: '/paiement?offer=Dossier%20Standard' },
  { name: 'services', path: '/services' },
  { name: 'ressources', path: '/ressources' },
  { name: 'password-reset', path: '/password-reset' },
];

for (const route of routes) {
  test(`public route ${route.name} is not a white page`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await assertNoWhitePage(page);
  });
}

test('mobile landing shell renders navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('navigation', { name: /navigation mobile publique/i })).toBeVisible();
});

test('cookie banner can reject non-essential and page still renders', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const reject = page.getByRole('button', { name: /refuser le non essentiel/i });
  if (await reject.isVisible()) {
    await reject.click();
  }
  await assertNoWhitePage(page);
});
