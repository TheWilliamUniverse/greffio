import { test, expect } from '@playwright/test';
import { COOKIE_CONSENT_KEY } from '../src/config/cookieCatalog.js';

const DOSSIER_ID = 'e2e-forme-flow';
const MOBILE_VIEWPORT = { width: 390, height: 844 };

const e2eUser = {
  id: 'e2e-user',
  email: 'jean.dupont@example.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  phone: '0600000000',
  role: 'CLIENT',
};

const resumeQuestionnaire = {
  initiatorType: 'personne_physique',
  firstName: 'Jean',
  lastName: 'Dupont',
  nationality: 'Française',
  birthDate: '1990-01-01',
  email: 'jean.dupont@example.com',
  phone: '0600000000',
  typeFormalite: 'creation_societe',
  formeJuridiqueFamillePrimary: '',
  formeJuridiqueFamilleSecondary: '',
  formeJuridiqueFamille: '',
  connaissezFormeJuridique: '',
  comparateurIgnore: false,
  formeJuridique: '',
  _resume: {
    stepId: 'forme',
    fieldKey: 'formeJuridiqueFamillePrimary',
    categoryConfirmed: true,
  },
};

const resumeAtDemarcheQuestionnaire = {
  ...resumeQuestionnaire,
  typeFormalite: '',
  _resume: {
    stepId: 'demarche',
    fieldKey: 'typeFormalite',
    categoryConfirmed: false,
  },
};

const mockQuestionnaireApis = async (page, questionnairePayload = resumeQuestionnaire) => {
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/auth/refresh') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'e2e-access-token',
          refreshToken: 'e2e-refresh-token',
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

    if (url.includes('/api/dossiers') && url.includes('/questionnaire') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reference: 'GRE-E2E-001',
          questionnaire: questionnairePayload,
        }),
      });
      return;
    }

    if (url.includes('/api/dossiers') && url.includes('/questionnaire') && method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, dossier: { id: DOSSIER_ID } }),
      });
      return;
    }

    if (url.includes('/api/dossiers') && url.includes('/complete-step') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    if (url.endsWith('/api/dossiers') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dossier: { id: DOSSIER_ID, reference: 'GRE-E2E-001' } }),
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
};

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

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.addInitScript(({ user, consentKey }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('greffio_user', JSON.stringify(user));
    localStorage.setItem('greffio_token', 'e2e-access-token');
    localStorage.setItem('greffio_refresh_token', 'e2e-refresh-token');
    localStorage.setItem(consentKey, JSON.stringify({
      essential: true,
      functional: true,
      analytics: false,
      marketing: false,
      decidedAt: new Date().toISOString(),
    }));
  }, { user: e2eUser, consentKey: COOKIE_CONSENT_KEY });
  await mockQuestionnaireApis(page);
});

test.describe('questionnaire mobile – flux catégorie puis forme', () => {
  test('immatriculer une nouvelle structure → familles juridiques directement', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtDemarcheQuestionnaire);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expect(page.getByText('Choisissez une famille de formalité')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('radio', { name: /Immatriculer une nouvelle structure/i }).click();

    await expect(page.getByText('Quelle catégorie correspond à votre projet ?')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('radio', { name: /Créer une SASU/i })).toHaveCount(0);
    await page.getByRole('radio', { name: /Formes les plus courantes/i }).click();

    await expect(page.getByText(/Savez-vous déjà quelle forme juridique/i)).toBeVisible({ timeout: 10_000 });
  });

  test('catégorie commerciale → comparateur → ignorer', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expect(page.getByText('Quelle catégorie correspond à votre projet ?')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('radio', { name: /Sociétés commerciales classiques/i }).click();

    await expect(page.getByText(/Savez-vous déjà quelle forme juridique/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('radio', { name: /Non, j.*ai besoin d.*aide/i }).click();

    await expect(page.getByText(/Comparez les formes avant de choisir/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /Lancer le comparateur/i })).toBeVisible();
    await dismissCookieBanner(page);
    const ignoreButton = page.getByRole('button', { name: /Ignorer pour l'instant/i });
    await ignoreButton.scrollIntoViewIfNeeded();
    await ignoreButton.click();

    await expect(page.getByText(/Dénomination/i)).toBeVisible({ timeout: 15_000 });
  });

  test('catégorie commerciale → forme connue → SAS', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expect(page.getByText('Quelle catégorie correspond à votre projet ?')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('radio', { name: /Formes les plus courantes/i }).click();

    await expect(page.getByText(/Savez-vous déjà quelle forme juridique/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('radio', { name: /Oui, je sais déjà/i }).click();

    await expect(page.getByRole('heading', { name: /Forme juridique \*/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('radio', { name: /^SAS\b/i }).first().click();

    await expect(page.getByText(/Dénomination/i)).toBeVisible({ timeout: 15_000 });
  });

  test('Autres → catégorie secondaire → forme GAEC', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expect(page.getByText('Quelle catégorie correspond à votre projet ?')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('radio', { name: /^Autres\b/i }).click();

    await expect(page.getByText('Précisez votre catégorie')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('radio', { name: /Agricole/i }).click();

    await expect(page.getByRole('heading', { name: /Forme juridique \*/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('radio', { name: /^GAEC\b/i }).click();

    await expect(page.getByText(/Dénomination/i)).toBeVisible({ timeout: 15_000 });
  });
});
