import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mapStatutesDataToRenderContext } from '../mappers/mapStatutesDataToRenderContext.js';
import { renderWilliamSas2026Blocks, countWilliamArticles, estimatePageCount } from '../renderers/renderWilliamSas2026.js';
import { validateGeneratedStatuts } from '../validators/validateGeneratedStatuts.js';
import { generateStatutesDocument } from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, '../fixtures/williamEstablishments.fixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('fixture William — 27 articles et 16 pages', () => {
  const context = mapStatutesDataToRenderContext({
    legalForm: 'SAS',
    denomination: fixture.company.name,
    sigle: fixture.company.sigle,
    capital: '5000',
    nombreTitres: '5000',
    seat: { line1: '470 Promenade des Anglais', postalCode: '06200', city: 'Nice', country: 'France' },
    greffe: fixture.company.rcsCity,
    duree: '99',
    exerciceFin: fixture.company.fiscalYearEnd,
    premierExerciceFin: fixture.company.firstFiscalYearEnd,
    objetSocialBullets: [],
    associates: fixture.associates.map((a) => ({
      label: a.fullName,
      address: a.address,
      birthDate: a.birthDate,
      birthPlace: a.birthPlace,
      nationality: a.nationality,
      isMinor: a.isMinor,
      isMinorEmancipated: a.isEmancipated,
      legalRepresentatives: (a.legalRepresentatives || []).join(' et '),
      titlesCount: String(a.shares),
      share: String(a.sharePercentage),
      roleLabel: a.roleLabel,
      contributionCash: a.cashContributionFormatted,
      liberationAmount: a.cashReleasedFormatted,
    })),
    president: fixture.officers.president,
    directeurGeneral: fixture.officers.directorGeneral,
    apportsNumeraireTotal: '3000',
    apportsNatureTotal: '2000',
    depotFonds: '1500',
    signatureCity: fixture.execution.city,
    signatureDate: fixture.execution.date,
    exemplairesOriginaux: fixture.execution.originalsCount,
    capitalVariable: true,
    capitalMin: '5000',
    capitalMax: '5000000',
  });

  const blocks = renderWilliamSas2026Blocks(context);
  assert.equal(countWilliamArticles(blocks), 27);
  assert.equal(estimatePageCount(blocks), 16);

  const validation = validateGeneratedStatuts({ blocks, context, legalForm: 'SAS' });
  assert.equal(validation.ok, true, validation.errors.join('; '));
});

test('generateStatutesDocument — document legacy avec métadonnées', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: fixture.company.name,
    sigle: fixture.company.sigle,
    capital: '5000',
    nombreTitres: '5000',
    seat: { line1: '470 Promenade des Anglais', postalCode: '06200', city: 'Nice', country: 'France', full: fixture.company.registeredOffice },
    greffe: fixture.company.rcsCity,
    duree: '99',
    exerciceFin: fixture.company.fiscalYearEnd,
    premierExerciceFin: fixture.company.firstFiscalYearEnd,
    associates: fixture.associates.map((a) => ({
      label: a.fullName,
      address: a.address,
      birthDate: a.birthDate,
      birthPlace: a.birthPlace,
      nationality: a.nationality,
      isMinor: a.isMinor,
      isMinorEmancipated: a.isEmancipated,
      legalRepresentatives: (a.legalRepresentatives || []).join(' et '),
      titlesCount: String(a.shares),
      share: String(a.sharePercentage),
      roleLabel: a.roleLabel,
    })),
    president: fixture.officers.president,
    directeurGeneral: fixture.officers.directorGeneral,
    signatureCity: fixture.execution.city,
    signatureDate: fixture.execution.date,
  });

  assert.equal(doc.metadata.articleCount, 27);
  assert.equal(doc.metadata.pageCount, 16);
  assert.equal(doc.blocks.filter((b) => b.kind === 'article').length, 27);
});
