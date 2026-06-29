import { test, expect } from '@playwright/test';
import { COOKIE_CONSENT_KEY } from '../src/config/cookieCatalog.js';

const e2eUser = {
  id: 'e2e-mock-user',
  email: 'jean.dupont@example.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  phone: '0600000000',
  role: 'CLIENT',
};

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(({ user, consentKey }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('greffio_user', JSON.stringify(user));
    localStorage.setItem('greffio_token', 'e2e-mock-access-token');
    localStorage.setItem('greffio_refresh_token', 'e2e-mock-refresh-token');
    localStorage.setItem(consentKey, JSON.stringify({
      essential: true,
      functional: true,
      analytics: false,
      marketing: false,
      decidedAt: new Date().toISOString(),
    }));
  }, { user: e2eUser, consentKey: COOKIE_CONSENT_KEY });

  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/auth/refresh') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-mock-access-token',
          refreshToken: 'e2e-mock-refresh-token',
        }),
      });
      return;
    }

    if (url.includes('/api/user/profile') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: e2eUser }),
      });
      return;
    }

    if (url.includes('/api/dossiers') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dossiers: [] }),
      });
      return;
    }

    await route.fallback();
  });
});

test.describe('authenticated cockpit smoke (mocked APIs)', () => {
  test('dashboard renders with mocked session', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByRole('heading', { name: /cockpit greffio|bonjour/i })).toBeVisible({ timeout: 20_000 });
  });

  test('mobile viewport dossiers and assistant documents', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/dashboard', '/dossiers', '/assistant-documents']) {
      await page.goto(path);
      await expect(page.locator('#root')).toBeVisible();
    }
  });
});
