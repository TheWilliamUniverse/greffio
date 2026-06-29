import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mapStatutesData } from '../../utils/statutesDataMapper.js';
import { mapStatutesDataToRenderContext } from '../mappers/mapStatutesDataToRenderContext.js';
import { renderWilliamSas2026Blocks, countWilliamArticles, estimatePageCount } from '../renderers/renderWilliamSas2026.js';
import { validateGeneratedStatuts } from '../validators/validateGeneratedStatuts.js';
import { generateStatutesDocument } from '../index.js';
import { buildPowersAnnexe } from '../../legal/statutes/shared/annexes.js';
import { joinStatutesArticleBody, classifyStatutesSubheading } from '../shared/normalizeStatutesParagraphs.js';
import { formatLegalEntityAssociateDescription } from '../shared/formatLegalEntityAssociate.js';
import { buildWilliamCover } from '../../legal/statutes/reference/williamHelpers.js';
import { renderAssociatesPreamble } from '../renderers/renderWilliamSas2026.js';
import {
  buildStatutesCoverExportElements,
  formatCoverSeatLines,
  layoutStatutesCover,
} from '../shared/statutesCoverLayout.js';
import { getTribunalCatalogStats } from '../catalogs/tribunalCommerceCatalog.js';
import { formatStatutesFiscalEnd } from '../shared/statutesDates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, '../fixtures/williamEstablishments.fixture.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('fixture William – 27 articles et 16 pages', () => {
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

test('joinStatutesArticleBody – fusionne les césures de lignes', () => {
  const body = joinStatutesArticleBody([
    'Dans les rapports entre Associés, le Président peut accomplir tous',
    "actes de direction, de disposition, de gestion et d'administration de la",
    "Société, dans la limite de l'objet social et des prérogatives des décisions",
    "d'Associés.",
    'Le Directeur Général est investi des mêmes pouvoirs.',
  ]);
  assert.equal(body.split('\n\n').length, 2);
  assert.match(body, /accomplir tous actes de direction/);
});

test('generateStatutesDocument – article 9 sans fragments éclatés', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TRUE POWER',
    capital: '1000',
    nombreTitres: '1000',
    seat: { line1: '1 rue Test', postalCode: '06200', city: 'Nice', country: 'France', full: '1 rue Test, 06200 Nice' },
    greffe: 'Nice',
    duree: '99',
    associates: [{ label: 'William Abdou', address: 'Nice', share: '100', titlesCount: '1000' }],
    president: 'William Abdou',
    directeurGeneral: 'Aucun',
  });
  const art9 = doc.blocks.find((b) => b.number === 9);
  assert.ok(art9?.body.includes('accomplir tous actes de direction'));
  assert.doesNotMatch(art9?.body || '', /accomplir tous\n\nactes/);
});

test('generateStatutesDocument – document legacy avec métadonnées', () => {
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
  assert.ok(doc.cover?.capitalLine);
  assert.ok(doc.signatures?.intro?.length);

  const titleTwoIdx = doc.blocks.findIndex((b) => b.kind === 'legal-title' && String(b.text).includes('TITRE II'));
  const article8Idx = doc.blocks.findIndex((b) => b.kind === 'article' && b.number === 8);
  assert.ok(titleTwoIdx >= 0 && article8Idx > titleTwoIdx, 'Article 8 doit suivre TITRE II, pas être regroupé sous TITRE I uniquement');

  const lastArticleIdx = doc.blocks.findLastIndex((b) => b.kind === 'article' && b.number === 27);
  const trailingTitles = doc.blocks.slice(lastArticleIdx + 1).filter((b) => b.kind === 'legal-title');
  assert.equal(trailingTitles.length, 0, `Titres orphelins en fin de document : ${trailingTitles.map((t) => t.text).join(', ')}`);

  const article17 = doc.blocks.find((b) => b.kind === 'article' && b.number === 17);
  assert.ok(article17?.title?.toLowerCase().includes('exclusion'), 'Article 17 doit porter sur l\'exclusion');
});

test('dossier sans mineur non émancipé – pas de clause Ibtissam parasite', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'FONDATION ABDOU ALI',
    capital: '10000',
    nombreTitres: '10000',
    seat: { line1: '1 rue Test', postalCode: '75001', city: 'Paris', country: 'France', full: '1 rue Test, 75001 Paris, France' },
    greffe: 'Paris',
    duree: '99',
    exerciceFin: '31/12',
    associates: [
      {
        label: 'Monsieur Jean DUPONT',
        address: '1 rue Test, 75001 Paris',
        share: '100 %',
        titlesCount: '10000',
        isMinor: false,
        roleLabel: 'Président',
      },
    ],
    president: 'Monsieur Jean DUPONT',
    directeurGeneral: 'Aucun',
    signatureCity: 'Paris',
    signatureDate: '24 mai 2026',
  });

  const body = doc.blocks.map((b) => b.body || b.text || '').join('\n');
  assert.ok(!/Ibtissam\s+ABDOU/i.test(body), 'clause échantillon Ibtissam dans le corps');
  assert.ok(!doc.signatures?.minorRepresentationNote, 'note mineur sans mineur non émancipé');
});

test('dossier avec mineur – pas de clause boilerplate art. 382 en signatures', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: fixture.company.name,
    sigle: fixture.company.sigle,
    capital: '5000',
    nombreTitres: '5000',
    seat: { line1: '470 Promenade des Anglais', postalCode: '06200', city: 'Nice', country: 'France', full: fixture.company.registeredOffice },
    greffe: fixture.company.rcsCity,
    duree: '99',
    associates: fixture.associates.map((a) => ({
      label: a.fullName,
      civility: a.fullName.startsWith('Ibtissam') ? 'Mme' : 'M.',
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
  });

  const body = doc.blocks.map((b) => b.body || b.text || '').join('\n');
  assert.ok(!/administrateurs légaux conformément aux articles 382/i.test(body));
  assert.ok(!doc.signatures?.minorRepresentationNote);
  assert.match(doc.signatures?.intro?.[0] || '', /^Établi à .+ le \d/);
  assert.match(doc.signatures?.intro?.[1] || '', /^En \d+ exemplaires originaux\.$/);
});

test('tribunal de commerce déterminé par la ville du siège', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TRUE POWER',
    capital: '1000',
    nombreTitres: '1000',
    seat: { line1: '1 rue Test', postalCode: '06200', city: 'Nice', country: 'France', full: '1 rue Test, 06200 Nice' },
    greffe: 'Nice',
    duree: '99',
    associates: [{ label: 'Jean DUPONT', address: 'Nice', share: '100', titlesCount: '1000' }],
    president: 'Jean DUPONT',
    directeurGeneral: 'Aucun',
  });

  const art25 = doc.blocks.find((b) => b.number === 25);
  const art26 = doc.blocks.find((b) => b.number === 26);
  const art27 = doc.blocks.find((b) => b.number === 27);
  assert.ok(art25?.body.includes('Tribunal de commerce de Nice'), 'médiation : TC de Nice');
  assert.ok(art26?.body.includes('Tribunal de commerce de Nice'), 'litiges : TC de Nice');
  assert.ok(art27?.body.includes('Tribunal de commerce de Nice'), 'art. 27 : TC de Nice');
  assert.ok(!/Tribunal compétent du siège social/i.test(doc.blocks.map((b) => b.body || '').join('\n')));
});

test('commune sans TC – rattachement catalogue (Cagnes → Nice)', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TEST CAGNES',
    capital: '1000',
    nombreTitres: '1000',
    seat: { line1: '1 av. Test', postalCode: '06800', city: 'Cagnes-sur-Mer', country: 'France' },
    duree: '99',
    associates: [{ label: 'Jean DUPONT', address: 'Cagnes', share: '100', titlesCount: '1000' }],
    president: 'Jean DUPONT',
    directeurGeneral: 'Aucun',
  });

  const body = doc.blocks.filter((b) => b.kind === 'article').map((b) => b.body).join('\n');
  assert.ok(body.includes('Tribunal de commerce de Nice'), 'Cagnes rattachée à Nice');
  assert.ok(!body.includes('Tribunal de commerce de Cagnes-sur-Mer'));
});

test('commune sans TC – rattachement catalogue (Cannes → Grasse)', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TEST CANNES',
    capital: '1000',
    nombreTitres: '1000',
    seat: { line1: '1 bd Test', postalCode: '06400', city: 'Cannes', country: 'France' },
    duree: '99',
    associates: [{ label: 'Jean DUPONT', address: 'Cannes', share: '100', titlesCount: '1000' }],
    president: 'Jean DUPONT',
    directeurGeneral: 'Aucun',
  });

  const body = doc.blocks.filter((b) => b.kind === 'article').map((b) => b.body).join('\n');
  assert.ok(body.includes('Tribunal de commerce de Grasse'), 'Cannes rattachée à Grasse');
});
test('catalogue tribunal – couverture nationale exhaustive', () => {
  const stats = getTribunalCatalogStats();
  assert.ok(stats?.communes >= 34000, `au moins 34000 communes, obtenu ${stats?.communes}`);
  assert.ok(stats?.seats >= 100, 'sièges TC référencés');
});
test('dates de naissance sans slash dans le préambule', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TEST DATES',
    capital: '1000',
    nombreTitres: '1000',
    seat: { line1: '1 rue Test', postalCode: '75001', city: 'Paris', country: 'France' },
    greffe: 'Paris',
    duree: '99',
    exerciceFin: '31/12',
    premierExerciceFin: '31/12/2026',
    associates: [{
      label: 'Jean DUPONT',
      address: 'Paris',
      birthDate: '14/08/2008',
      birthPlace: 'Paris',
      share: '100',
      titlesCount: '1000',
    }],
    president: 'Jean DUPONT',
    directeurGeneral: 'Aucun',
  });

  const preamble = doc.blocks.filter((b) => b.kind === 'paragraph').map((b) => b.text).join('\n');
  assert.ok(!/\d{2}\/\d{2}\/\d{4}/.test(preamble), 'pas de date JJ/MM/AAAA dans le préambule');
  const art5 = doc.blocks.find((b) => b.number === 5);
  assert.ok(art5?.body.includes('31 décembre'), 'clôture sans slash');
});

test('joinStatutesArticleBody – sous-parties numérotées sur paragraphes distincts', () => {
  const body = joinStatutesArticleBody([
    '7.4 Libération partielle des apports',
    'Les apports en numéraire qui ne sont pas libérés au moment de la constitution de la Société, le seront par appel du Président.',
    '7.5 Dépôt des fonds',
    'La somme de 1500 euros est déposée sur un compte ouvert au nom de la société en formation.',
  ]);
  const parts = body.split('\n\n');
  assert.equal(parts.length, 4);
  assert.match(parts[0], /^7\.4 Libération/);
});

test('classifyStatutesSubheading – gras seul ou gras + souligné', () => {
  assert.equal(classifyStatutesSubheading('7.4 Libération partielle des apports'), 'bold');
  assert.equal(classifyStatutesSubheading('7.1 Apports de William ABDOU :'), 'underline');
  assert.equal(classifyStatutesSubheading('27.1 - Langue officielle des documents juridiques :'), 'underline');
  assert.equal(classifyStatutesSubheading('Les associés apportent en numéraire'), null);
});

test('buildWilliamCover – immatriculation RCS par défaut', () => {
  const cover = buildWilliamCover({
    greffe: 'Nice',
    denomination: 'TEST',
    seat: { line1: '1 rue Test', postalCode: '06200', city: 'Nice' },
  });
  assert.match(cover.registryLine, /^Immatriculée au Registre du Commerce/);
  assert.doesNotMatch(cover.registryLine, /En cours d'immatriculation/);
});

test('personne morale – descriptif complet dans le préambule', () => {
  const context = mapStatutesDataToRenderContext({
    legalForm: 'SAS',
    denomination: 'WILLIAM ESTABLISHMENTS',
    greffe: 'Nice',
    seat: { line1: '470 Promenade des Anglais', postalCode: '06200', city: 'Nice' },
    associates: [
      {
        associateType: 'personne_morale',
        companyName: 'WILLIAM ESTABLISHMENTS',
        legalForm: 'SAS',
        siren: '102 230 414',
        address: '470 Promenade des Anglais, 06200 Nice',
        representativeName: 'Nobatène ABDOU',
        representativeQuality: 'Président',
        roleLabel: 'Président désigné',
      },
      {
        label: 'William ABDOU',
        address: 'Nice',
        birthDate: '28/07/2009',
        birthPlace: 'Mamoudzou',
        nationality: 'française',
      },
    ],
  });
  const lines = renderAssociatesPreamble(context);
  const pmLine = lines.find((line) => line.includes('WILLIAM ESTABLISHMENTS'));
  assert.ok(pmLine);
  assert.match(pmLine, /Société par Actions Simplifiée \(SAS\)/);
  assert.match(pmLine, /immatriculée au RCS de Nice sous le numéro 102 230 414/);
  assert.match(pmLine, /siège social est situé 470 Promenade des Anglais/);
  assert.match(pmLine, /représentée par Nobatène ABDOU/);
  assert.match(pmLine, /agissant en qualité de Président, dûment habilitée aux fins des présentes/);
  assert.ok(lines.some((line) => line.includes('Ci-après dénommés collectivement « les Associés »')));
});

test('formatLegalEntityAssociateDescription – forme juridique explicite', () => {
  const text = formatLegalEntityAssociateDescription({
    fullName: 'WILLIAM ESTABLISHMENTS',
    legalFormLabel: 'Société par Actions Simplifiée (SAS)',
    siren: '102 230 414',
    address: '470 Promenade des Anglais, 06200 Nice',
    representativeName: 'Nobatène ABDOU',
    roleLabel: 'Président désigné',
  }, { greffeCity: 'Nice' });
  assert.match(text, /WILLIAM ESTABLISHMENTS, Société par Actions Simplifiée \(SAS\), immatriculée au RCS de Nice sous le numéro 102 230 414/);
});

test('layoutStatutesCover – page de garde sur une page avec espacement flexible', () => {
  const layout = layoutStatutesCover({
    title: 'STATUTS',
    legalFormLabel: 'Société par Actions Simplifiée (SAS)',
    denomination: 'TRUE POWER',
    capitalLine: 'Société par Actions Simplifiée au capital de 10 000 euros',
    seatBlock: 'Siège social :\n470 Promenade des Anglais\n06200 Nice',
    registryLine: 'Immatriculée au Registre du Commerce et des Sociétés de Nice',
  });
  assert.equal(layout.fontSize, 18);
  assert.ok(layout.flexGap >= layout.sectionGap * 2);
  assert.ok(layout.topLines.some((line) => /TRUE POWER/.test(line.text)));
  assert.ok(formatCoverSeatLines('Siège social :\n470 Promenade des Anglais\n06200 Nice')[0].includes('470 Promenade des Anglais'));
});

test('buildStatutesCoverExportElements – pas de page blanche initiale', () => {
  const elements = buildStatutesCoverExportElements({
    title: 'STATUTS',
    legalForm: 'SASU',
    legalFormLabel: 'Société par Actions Simplifiée Unipersonnelle (SASU)',
    denomination: 'TRUE POWER',
    capitalLine: 'Société par Actions Simplifiée Unipersonnelle au capital de 10 000 euros',
    seatBlock: 'Siège social :\n470 Promenade des Anglais\n06200 Nice',
    registryLine: 'Immatriculée au Registre du Commerce et des Sociétés de Nice',
  });
  assert.notEqual(elements[0]?.type, 'page-break');
  assert.equal(elements[0]?.type, 'cover-title');
});

test('layoutStatutesCover – dénomination et forme juridique sur une ligne', () => {
  const layout = layoutStatutesCover({
    title: 'STATUTS',
    legalForm: 'SASU',
    legalFormLabel: 'Société par Actions Simplifiée Unipersonnelle (SASU)',
    denomination: 'TRUE POWER',
    capitalLine: 'Société par Actions Simplifiée Unipersonnelle au capital de 10 000 euros',
    seatBlock: 'Siège social :\n470 Promenade des Anglais\n06200 Nice',
    registryLine: 'Immatriculée au Registre du Commerce et des Sociétés de Nice',
  });
  assert.ok(layout.topLines.some((line) => line.text === 'TRUE POWER Société par Actions Simplifiée Unipersonnelle'));
});

test('buildStatutesCoverExportElements – sauts d’espaces réguliers avant RCS', () => {
  const elements = buildStatutesCoverExportElements({
    title: 'STATUTS',
    legalFormLabel: 'Société par Actions Simplifiée (SAS)',
    denomination: 'TRUE POWER',
    capitalLine: 'Société par Actions Simplifiée au capital de 10 000 euros',
    seatBlock: 'Siège social :\n470 Promenade des Anglais\n06200 Nice',
    registryLine: 'Immatriculée au Registre du Commerce et des Sociétés de Nice',
  });
  const spacerCount = elements.filter((item) => item.type === 'cover-spacer').length;
  assert.ok(spacerCount >= 4);
  const registryIdx = elements.findIndex((item) => item.text?.includes('Immatriculée au Registre'));
  const lastSpacerIdx = elements.findLastIndex((item) => item.type === 'cover-spacer');
  assert.ok(registryIdx > lastSpacerIdx);
});

test('generateStatutesDocument – article 7 avec sous-parties séparées', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: fixture.company.name,
    capital: '5000',
    nombreTitres: '5000',
    seat: { line1: '470 Promenade des Anglais', postalCode: '06200', city: 'Nice', country: 'France' },
    greffe: 'Nice',
    associates: fixture.associates.map((a) => ({
      label: a.fullName,
      address: a.address,
      birthDate: a.birthDate,
      birthPlace: a.birthPlace,
      nationality: a.nationality,
      titlesCount: String(a.shares),
      share: String(a.sharePercentage),
    })),
    president: 'William ABDOU',
  });
  assert.match(doc.cover.registryLine, /^Immatriculée au Registre du Commerce/);
  const art7 = doc.blocks.find((b) => b.number === 7);
  assert.ok(art7?.body.includes('7.4 Libération partielle des apports'));
  assert.ok(art7?.body.split('\n\n').some((p) => /^7\.1 Apports de/.test(p.trim())));
});

test('generateStatutesDocument – capital 10 000 € cohérent article 5 / 7 / annexe', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TRUE POWER',
    capital: '10 000',
    nombreTitres: '1 000',
    liberationCapital: '50 %',
    seat: { line1: '470 Promenade des Anglais', postalCode: '06200', city: 'Nice', country: 'France' },
    greffe: 'Nice',
    associates: [
      { label: 'WILLIAM ESTABLISHMENTS', share: '75 %', titlesCount: '750', contributionCash: '7500', associateType: 'personne_morale', companyName: 'WILLIAM ESTABLISHMENTS', representativeName: 'Nobatène ABDOU', representativeQuality: 'Président' },
      { label: 'William Abdou', share: '25 %', titlesCount: '250', contributionCash: '2500', birthDate: '28/07/2009', birthPlace: 'Mamoudzou', address: 'Nice' },
    ],
    president: 'WILLIAM ESTABLISHMENTS',
    directeurGeneral: 'William Abdou',
  });
  const art5 = doc.blocks.find((b) => b.number === 5);
  const art7 = doc.blocks.find((b) => b.number === 7);
  assert.ok(art5?.body.includes('actions de 10 euros chacune'));
  assert.ok(art7?.body.includes('Il n\'y a aucun apport en nature'));
  assert.ok(art7?.body.includes('libéré à hauteur de 50 %'));
  assert.ok(art7?.body.includes('La somme de 5 000 euros'));
  assert.ok(!/libéré à hauteur de 100 %/i.test(art7?.body || ''));
  const annexe = doc.annexes?.[0];
  assert.ok(annexe?.paragraphs?.some((p) => p.includes('Valeur nominale : 10 euro')));
});

test('generateStatutesDocument – libération 100 % article 7.4 intégrale', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TRUE POWER',
    capital: '1 000',
    nombreTitres: '1 000',
    liberationCapital: '100 %',
    seat: { line1: '1 rue Test', postalCode: '06200', city: 'Nice', country: 'France' },
    greffe: 'Nice',
    associates: [{ label: 'William Abdou', share: '100', titlesCount: '1000', address: 'Nice' }],
    president: 'William Abdou',
  });
  const art7 = doc.blocks.find((b) => b.number === 7);
  assert.ok(art7?.body.includes('7.4 Libération intégrale des apports'));
  assert.ok(art7?.body.includes('intégralement libérés lors de la constitution'));
  assert.ok(art7?.body.includes('entièrement libérés lors de la constitution'));
});

test('generateStatutesDocument – libération différenciée par associé', () => {
  const doc = generateStatutesDocument({
    legalForm: 'SAS',
    denomination: 'TRUE POWER',
    capital: '10 000',
    nombreTitres: '1 000',
    liberationCapital: '50 %',
    seat: { line1: '470 Promenade des Anglais', postalCode: '06200', city: 'Nice', country: 'France' },
    greffe: 'Nice',
    associates: [
      { label: 'Associé A', share: '75 %', titlesCount: '750', liberationAmount: '3750' },
      { label: 'Associé B', share: '25 %', titlesCount: '250', liberationAmount: '2500' },
    ],
    president: 'Associé A',
  });
  const art7 = doc.blocks.find((b) => b.number === 7);
  assert.ok(art7?.body.includes('7.4 Libération partielle et différenciée des apports'));
  assert.ok(art7?.body.includes('libéré à hauteur de 50 %'));
  assert.ok(art7?.body.includes('entièrement libérés lors de la constitution'));
});

test('resolveGlobalLiberationPercent – Autre sans valeur bloque la génération', () => {
  assert.throws(
    () => mapStatutesDataToRenderContext({
      legalForm: 'SAS',
      denomination: 'TEST',
      capital: '1000',
      nombreTitres: '1000',
      liberationCapital: 'Autre',
      seat: { line1: '1 rue Test', postalCode: '06200', city: 'Nice', country: 'France' },
      associates: [{ label: 'Test', share: '100', titlesCount: '1000' }],
    }),
    (error) => error.code === 'LIBERATION_CUSTOM_PERCENT_INVALID',
  );
});

test('deriveStatutsCapitalModel – montant libéré incompatible avec taux bloque', () => {
  assert.throws(
    () => mapStatutesDataToRenderContext({
      legalForm: 'SAS',
      denomination: 'TEST',
      capital: '7500',
      nombreTitres: '7500',
      liberationCapital: '100 %',
      seat: { line1: '1 rue Test', postalCode: '06200', city: 'Nice', country: 'France' },
      associates: [
        { label: 'Associé A', share: '100', titlesCount: '7500', liberationAmount: '3750', liberationPercent: '100' },
      ],
    }),
    (error) => error.code === 'STATUTES_CAPITAL_INCONSISTENT',
  );
});

test('mapStatutesData – montant global erroné sur associé est corrigé', () => {
  const statutesData = mapStatutesData({
    dossier: { id: 'test', reference: 'GF-TEST' },
    questionnaire: {
      formeJuridique: 'SASU',
      denomination: 'TRUE POWER',
      capital: '1000',
      liberationCapital: '50 %',
      adresseSiege: '470 Promenade des Anglais',
      codePostal: '06200',
      villeSiege: 'Nice',
      associates: [{
        label: 'William ABDOU',
        share: '100 %',
        liberationAmount: '5000',
        liberationRate: '50 %',
      }],
    },
  });
  const ctx = mapStatutesDataToRenderContext(statutesData);
  assert.equal(ctx.capitalModel.associatesComputed[0].releasedAmount, 500);
  assert.equal(ctx.capitalModel.associatesComputed[0].subscribedAmount, 1000);
});

test('buildPowersAnnexe – aligné procuration (elle, sans annonce légale)', () => {
  const annex = buildPowersAnnexe({ mandataire: 'WILLIAM ESTABLISHMENTS' });
  const joined = annex.paragraphs.join(' ');
  assert.match(joined, /qu'elle désignera/);
  assert.doesNotMatch(joined, /annonce légale/i);
  assert.ok(annex.paragraphs.some((line) => /guichet unique/i.test(line)));
});
