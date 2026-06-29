import { test, expect } from '@playwright/test';
import { COOKIE_CONSENT_KEY } from '../src/config/cookieCatalog.js';

const DOSSIER_ID = 'e2e-forme-flow';
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
/** Select fields auto-advance shortly after tap once React commits the new value. */
const TAP_ADVANCE_MS = 700;

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

const resumeAtContactFormaliteQuestionnaire = {
  ...resumeQuestionnaire,
  typeFormalite: '',
  _resume: {
    stepId: 'contact',
    fieldKey: 'typeFormalite',
    categoryConfirmed: false,
  },
};

const resumeAtLiberationCapital = {
  initiatorType: 'personne_physique',
  firstName: 'Jean',
  lastName: 'Dupont',
  nationality: 'Française',
  birthDate: '1990-01-01',
  email: 'jean.dupont@example.com',
  phone: '0600000000',
  typeFormalite: 'creation_societe',
  formeJuridiqueFamillePrimary: 'commercial',
  formeJuridiqueFamille: 'commercial',
  connaissezFormeJuridique: 'oui',
  comparateurIgnore: false,
  formeJuridique: 'SASU',
  denomination: 'Test SASU E2E',
  adresseSiege: '12 rue de la République',
  codePostal: '75001',
  villeSiege: 'Paris',
  activite: 'Conseil en stratégie digitale et accompagnement des PME.',
  capital: '1000',
  liberationCapital: '',
  _resume: {
    stepId: 'entreprise',
    fieldKey: 'liberationCapital',
    categoryConfirmed: true,
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

const waitForTapAdvance = async (page, ms = TAP_ADVANCE_MS) => {
  await page.waitForTimeout(ms);
};

const tapChoice = async (page, name) => {
  await page.getByRole('radio', { name }).click();
  await waitForTapAdvance(page);
};

const expectStepHeading = async (page, name) => {
  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 });
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

test.describe('questionnaire mobile – tap-to-advance contact', () => {
  test('initiateur personne physique avance sans bouton Continuer', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, {
      initiatorType: '',
      firstName: '',
      lastName: '',
      nationality: 'Française',
      birthDate: '',
      email: '',
      phone: '',
      typeFormalite: '',
      _resume: { stepId: 'contact', fieldKey: 'initiatorType', categoryConfirmed: false },
    });
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Type de déclarant/i);
    await tapChoice(page, /Personne physique/i);
    await expectStepHeading(page, /Prénom/i);
  });
});

test.describe('questionnaire mobile – flux catégorie puis forme', () => {
  test('famille de formalité en grille 2 colonnes sur mobile', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtContactFormaliteQuestionnaire);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Choisissez une famille de formalité/i);
    const grid = page.locator('.mobile-choice-grid').first();
    await expect(grid).toHaveClass(/grid-cols-2/);
  });

  test('modifications → démarche tap avance vers SIREN existant', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtContactFormaliteQuestionnaire);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Choisissez une famille de formalité/i);
    await tapChoice(page, /Capital, gouvernance, activité/i);

    await expectStepHeading(page, /Quelle démarche/i);
    const demarcheGrid = page.locator('.mobile-choice-grid').first();
    await expect(demarcheGrid).toHaveClass(/grid-cols-2/);
    await tapChoice(page, /Changer de dirigeant/i);

    await expectStepHeading(page, /SIREN/i);
  });

  test('immatriculer une nouvelle structure → familles juridiques directement', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtContactFormaliteQuestionnaire);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Choisissez une famille de formalité/i);
    await tapChoice(page, /Immatriculer une nouvelle structure/i);

    await expectStepHeading(page, /Quelle catégorie correspond à votre projet/i);
    await expect(page.getByRole('radio', { name: /Créer une SASU/i })).toHaveCount(0);
    await tapChoice(page, /Formes les plus courantes/i);
    await expectStepHeading(page, /Savez-vous déjà quelle forme juridique/i);
  });

  test('catégorie commerciale → comparateur → ignorer', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Quelle catégorie correspond à votre projet/i);
    await tapChoice(page, /Sociétés commerciales classiques/i);
    await expectStepHeading(page, /Savez-vous déjà quelle forme juridique/i);
    await tapChoice(page, /Non, j.*ai besoin d.*aide/i);

    await expectStepHeading(page, /Comparez les formes avant de choisir/i);
    await expect(page.getByRole('link', { name: /Lancer le comparateur/i })).toBeVisible();
    await dismissCookieBanner(page);
    const ignoreButton = page.getByRole('button', { name: /Ignorer pour l'instant/i });
    await ignoreButton.scrollIntoViewIfNeeded();
    await ignoreButton.click();
    await waitForTapAdvance(page, 500);

    await expectStepHeading(page, /Dénomination/i);
  });

  test('catégorie commerciale → forme connue → SAS', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Quelle catégorie correspond à votre projet/i);
    await tapChoice(page, /Formes les plus courantes/i);
    await expectStepHeading(page, /Savez-vous déjà quelle forme juridique/i);
    await tapChoice(page, /Oui, je sais déjà/i);

    await expectStepHeading(page, /Forme juridique/i);
    await tapChoice(page, /^SAS /i);

    await expectStepHeading(page, /Dénomination/i);
  });

  test('catégorie commerciale → forme connue → SASU', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Quelle catégorie correspond à votre projet/i);
    await tapChoice(page, /Formes les plus courantes/i);
    await expectStepHeading(page, /Savez-vous déjà quelle forme juridique/i);
    await tapChoice(page, /Oui, je sais déjà/i);

    await expectStepHeading(page, /Forme juridique/i);
    await tapChoice(page, /^SASU /i);

    await expectStepHeading(page, /Dénomination/i);
  });

  test('Autres → catégorie secondaire → forme GAEC', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Quelle catégorie correspond à votre projet/i);
    await tapChoice(page, /^Autres\b/i);
    await expectStepHeading(page, /Précisez votre catégorie/i);
    await tapChoice(page, /Agricole/i);

    await expectStepHeading(page, /Forme juridique/i);
    await tapChoice(page, /^GAEC\b/i);

    await expectStepHeading(page, /Dénomination/i);
  });
});

const resumeAtAdresseSiege = {
  initiatorType: 'personne_physique',
  firstName: 'Jean',
  lastName: 'Dupont',
  nationality: 'Française',
  birthDate: '1990-01-01',
  email: 'jean.dupont@example.com',
  phone: '0600000000',
  typeFormalite: 'creation_societe',
  formeJuridiqueFamillePrimary: 'commercial',
  formeJuridiqueFamille: 'commercial',
  connaissezFormeJuridique: 'oui',
  comparateurIgnore: false,
  formeJuridique: 'SASU',
  denomination: 'Test SASU E2E',
  adresseSiege: '',
  codePostal: '',
  villeSiege: '',
  activite: '',
  capital: '',
  liberationCapital: '',
  _resume: {
    stepId: 'entreprise',
    fieldKey: 'adresseSiege',
    categoryConfirmed: true,
  },
};

const resumeAtApportsMissingSiege = {
  initiatorType: 'personne_physique',
  firstName: 'Jean',
  lastName: 'Dupont',
  nationality: 'Française',
  birthDate: '1990-01-01',
  email: 'jean.dupont@example.com',
  phone: '0600000000',
  typeFormalite: 'creation_societe',
  formeJuridiqueFamillePrimary: 'commercial',
  formeJuridiqueFamille: 'commercial',
  connaissezFormeJuridique: 'oui',
  comparateurIgnore: false,
  formeJuridique: 'SASU',
  denomination: 'Test SASU E2E',
  adresseSiege: '',
  codePostal: '75001',
  villeSiege: 'Paris',
  activite: 'Conseil en stratégie digitale et accompagnement des PME.',
  capital: '1000',
  liberationCapital: '100 %',
  apportsNature: '',
  _resume: {
    stepId: 'entreprise',
    fieldKey: 'apportsNature',
    categoryConfirmed: true,
  },
};

test.describe('questionnaire mobile – saisie adresse siège', () => {
  test('saisie partielle ne fait pas avancer automatiquement', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtAdresseSiege);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Adresse du siège/i);
    const addressInput = page.getByPlaceholder('12 rue de la République');
    await addressInput.fill('12 rue');
    await page.waitForTimeout(900);
    await expectStepHeading(page, /Adresse du siège/i);

    await addressInput.fill('12 rue de la République');
    await page.getByRole('button', { name: 'Question suivante' }).click();
    await expectStepHeading(page, /Code postal du siège/i);
  });

  test('code postal partiel ne fait pas avancer automatiquement', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, {
      ...resumeAtAdresseSiege,
      adresseSiege: '12 rue de la République',
      _resume: {
        stepId: 'entreprise',
        fieldKey: 'codePostal',
        categoryConfirmed: true,
      },
    });
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Code postal du siège/i);
    const postalInput = page.getByPlaceholder('75001');
    await postalInput.fill('75');
    await page.waitForTimeout(900);
    await expectStepHeading(page, /Code postal du siège/i);

    await postalInput.fill('75001');
    await page.getByRole('button', { name: 'Question suivante' }).click();
    await expectStepHeading(page, /Ville du siège/i);
  });
});

test.describe('questionnaire mobile – libération du capital SASU', () => {
  test('libération intégrale avance vers apports en nature', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtLiberationCapital);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Libération du capital/i);
    await tapChoice(page, /Libération intégrale/i);
    await expectStepHeading(page, /apports en nature/i);
  });

  test('siège manquant sur apports → CTA, complétion, retour apports', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtApportsMissingSiege);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /apports en nature/i);
    await tapChoice(page, /Non, uniquement du numéraire/i);

    await expect(page.getByRole('button', { name: /Compléter l'adresse du siège/i })).toBeVisible();
    await page.getByRole('button', { name: /Compléter l'adresse du siège/i }).click();

    await expectStepHeading(page, /Adresse du siège/i);
    await page.getByPlaceholder('12 rue de la République').fill('12 rue de la République');
    await page.getByRole('button', { name: 'Question suivante' }).click();

    await expectStepHeading(page, /apports en nature/i);
  });

  test('libération partielle → Continuer avance vers apports en nature', async ({ page }) => {
    await page.unroute(/\/api\//);
    await mockQuestionnaireApis(page, resumeAtLiberationCapital);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Libération du capital/i);
    await tapChoice(page, /Libération partielle/i);
    await expect(page.getByRole('button', { name: 'Continuer' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expectStepHeading(page, /apports en nature/i);
  });
});

test.describe('questionnaire desktop – flux unifié step-by-step', () => {
  test('catégorie commerciale → forme connue → SAS (1280px)', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(`/questionnaire?dossierId=${DOSSIER_ID}`);
    await dismissCookieBanner(page);

    await expectStepHeading(page, /Quelle catégorie correspond à votre projet/i);
    await tapChoice(page, /Formes les plus courantes/i);
    await expectStepHeading(page, /Savez-vous déjà quelle forme juridique/i);
    await tapChoice(page, /Oui, je sais déjà/i);

    await expectStepHeading(page, /Forme juridique/i);
    await tapChoice(page, /^SAS /i);

    await expectStepHeading(page, /Dénomination/i);
  });
});
