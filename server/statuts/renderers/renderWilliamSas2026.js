import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '../templates/williamEstablishmentsSas2026.model.json');

let cachedTemplate = null;
export const loadWilliamTemplate = () => {
  if (!cachedTemplate) {
    cachedTemplate = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
  }
  return cachedTemplate;
};

const parseFrenchAmount = (value) => {
  const normalized = String(value || '').replace(/[^0-9,.-]/g, '').replace(',', '.');
  return Number(normalized) || 0;
};

export const renderAssociatesPreamble = (context) => {
  const lines = ['LES SOUSSIGNÉS :'];
  (context.associates || []).forEach((associate, index) => {
    if (index > 0) lines.push('ET');
    const identity = [
      associate.fullName,
      associate.address ? `demeurant ${associate.address}` : undefined,
      associate.birthDate || associate.birthPlace
        ? `né(e) le ${associate.birthDate ?? '[date à compléter]'} à ${associate.birthPlace ?? '[lieu à compléter]'}`
        : undefined,
      associate.nationality ? `de nationalité ${associate.nationality}` : undefined,
      associate.isMinor && associate.isEmancipated ? 'mineur émancipé' : undefined,
      associate.isMinor && !associate.isEmancipated ? 'mineur non émancipé' : undefined,
    ].filter(Boolean).join(', ');
    lines.push(`${identity}.`);
    if (associate.isMinor && !associate.isEmancipated && associate.legalRepresentatives?.length) {
      lines.push(`Représenté(e) légalement par ${associate.legalRepresentatives.join(' et ')}, jusqu’à sa majorité.`);
    }
  });
  lines.push('Ci-après dénommés collectivement « les Associés »,');
  return lines;
};

export const renderCapitalDistribution = (context) => {
  const lines = ['La répartition du capital est la suivante :'];
  (context.associates || []).forEach((associate) => {
    const percent = associate.sharePercentage != null
      ? `${associate.sharePercentage}% des actions`
      : '[pourcentage à compléter]';
    const shares = associate.shares != null
      ? `soit ${associate.shares.toLocaleString('fr-FR')} actions`
      : '[nombre d’actions à compléter]';
    lines.push(`${associate.fullName} : ${percent}, ${shares}.`);
  });
  return lines;
};

export const renderApports = (context) => {
  const lines = [];
  lines.push(`Les associés apportent en numéraire la somme de ${context.apports?.cashTotalFormatted ?? '[montant à compléter]'}.`);
  lines.push(`Les apports en nature sont chiffrés à ${context.apports?.inKindTotalFormatted ?? '[montant à compléter]'}.`);
  (context.associates || []).forEach((associate, index) => {
    lines.push(`7.${index + 1} Apports de ${associate.fullName} :`);
    if (associate.cashContributionFormatted) {
      lines.push(
        `Apport en numéraire de ${associate.cashContributionFormatted}, libéré à hauteur de ${context.apports?.liberationRate ?? '[taux à compléter]'} lors de la constitution, soit ${associate.cashReleasedFormatted ?? '[montant libéré à compléter]'}.`,
      );
    }
    if (associate.inKindContributions?.length) {
      lines.push(`Apports en nature : ${associate.inKindContributions.map((item) => `${item.label} (${item.valueFormatted})`).join(', ')}.`);
      const total = associate.inKindContributions
        .map((item) => parseFrenchAmount(item.valueFormatted))
        .reduce((a, b) => a + b, 0);
      lines.push(`Total apports en nature : ${total.toLocaleString('fr-FR')} euros.`);
    } else {
      lines.push('Pas d’apports en nature.');
    }
    if (associate.isMinor && !associate.isEmancipated) {
      lines.push('Étant mineur(e) non émancipé(e) au jour de la constitution, la souscription et la libération sont réalisées pour son compte par ses représentants légaux conformément à l’article 382 du Code civil.');
    }
  });
  lines.push('Les associés ont décidé de ne pas recourir à un commissaire aux apports conformément à la loi.');
  lines.push('7.4 Libération partielle des apports');
  lines.push('Les apports en numéraires qui ne sont pas libérés au moment de la constitution de la Société, le seront par appel du Président dans les cinq années civiles qui suivent sa création, en vertu de la Loi.');
  lines.push('7.5 Dépôt des fonds');
  lines.push(`La somme de ${context.apports?.depositedFundsFormatted ?? '[montant à compléter]'}, correspondant aux apports en numéraire libérés à la constitution est déposée sur un compte ouvert au nom de la société en formation, attesté par le dépositaire.`);
  return lines;
};

const renderArticleBody = (article, context) => {
  switch (article.number) {
    case 1:
      return [`Il est formé une Société par Actions Simplifiée dénommée ${context.company.name}${context.company.sigle ? `, et de sigle ${context.company.sigle}` : ''}.`];
    case 2: {
      const bullets = context.objectSocialBullets?.length
        ? context.objectSocialBullets
        : article.paragraphs.slice(1, -2);
      return [
        'La Société a pour objet social, directement ou indirectement, tant en France qu\'à l\'étranger :',
        ...bullets,
        `${context.company.name} est habilitée à exercer ses activités sous toute enseigne, marque ou nom commercial de son choix, et à commercialiser tous biens ou services non réglementés, directement ou indirectement, à ses clients dans ses marchés.`,
        'Et plus généralement, toutes opérations industrielles, commerciales, financières, mobilières et/ou immobilières se rapportant directement ou indirectement à l’objet social ci-dessus et à tous objets ou connexes pouvant favoriser son développement.',
      ];
    }
    case 3:
      return [`Le siège social est fixé au ${context.company.registeredOffice}.`];
    case 4:
      return [`La Société est constituée pour une durée de ${context.company.durationYears ?? 99} années à compter de son immatriculation au Registre du Commerce et des Sociétés, sauf dissolution anticipée ou prorogation.`];
    case 5:
      return [
        `Le capital social est fixé à la somme de ${context.company.capitalFormatted}, divisé en ${context.company.capitalAmount.toLocaleString('fr-FR')} actions de 1 euro chacune.`,
        ...(context.options?.variableCapital ? [
          `Le capital est variable conformément aux articles L.231-1 à L.231-8 du Code de commerce, avec un minimum de ${context.options.capitalMinFormatted ?? '[minimum à compléter]'} et un maximum de ${context.options.capitalMaxFormatted ?? '[maximum à compléter]'}.`,
          'Les augmentations ou réductions dans la fourchette du capital variable sont décidées par décision collective ordinaire des associés. Celles-ci sont constatées par le Président au registre, sans modification statutaire.',
        ] : []),
        ...renderCapitalDistribution(context),
        `L'exercice social se termine le ${context.company.fiscalYearEnd ?? '[date à compléter]'} de chaque année et recommence le jour suivant.`,
        `Par exception, le premier exercice sera clôturé le ${context.company.firstFiscalYearEnd ?? '[date à compléter]'}.`,
      ];
    case 7:
      return renderApports(context);
    case 8:
      return [
        'La société est dirigée par un Président nommé par décision collective des associés.',
        `Le Président est ${context.officers?.president ?? '[Président à compléter]'}.`,
        ...(context.officers?.directorGeneral ? [`Le Directeur Général est ${context.officers.directorGeneral}.`] : []),
      ];
    case 27:
      return article.paragraphs.filter((p) => !p.includes('Établi à') && !p.includes('Lu et approuvé') && !p.includes('William ABDOU'));
    default:
      return article.paragraphs;
  }
};

export const renderWilliamSas2026Blocks = (context) => {
  const template = loadWilliamTemplate();
  const blocks = [];

  blocks.push({ kind: 'cover', sourcePage: 1, text: 'STATUTS' });
  blocks.push({ kind: 'cover', sourcePage: 1, text: context.company.legalFormLabel });
  blocks.push({
    kind: 'cover',
    sourcePage: 1,
    text: `${context.company.name}${context.company.sigle ? ` (${context.company.sigle})` : ''}`,
  });
  blocks.push({
    kind: 'cover',
    sourcePage: 1,
    text: `${context.company.legalFormLabel} au capital de ${context.company.capitalFormatted}`,
  });
  blocks.push({ kind: 'cover', sourcePage: 1, text: `Siège social : ${context.company.registeredOffice}` });
  if (context.company.rcsCity) {
    blocks.push({
      kind: 'cover',
      sourcePage: 1,
      text: `Immatriculée au Registre du Commerce et des Sociétés de ${context.company.rcsCity}`,
    });
  }

  renderAssociatesPreamble(context).forEach((text) => {
    blocks.push({ kind: 'preamble', sourcePage: 2, text, pageBreakBefore: text === 'LES SOUSSIGNÉS :' });
  });

  const defsIndex = (template.preamble || []).findIndex((line) => String(line).startsWith('Définitions'));
  if (defsIndex >= 0) {
    template.preamble.slice(defsIndex).forEach((text) => {
      blocks.push({ kind: 'preamble', sourcePage: 2, text });
    });
  }

  let lastTitleGroup = '';
  template.articles.forEach((article) => {
    if (article.titleGroup !== lastTitleGroup) {
      blocks.push({
        kind: 'title',
        sourcePage: article.sourcePage,
        text: article.titleGroup,
        pageBreakBefore: article.sourcePage > 1,
      });
      lastTitleGroup = article.titleGroup;
    }
    blocks.push({
      kind: 'article',
      sourcePage: article.sourcePage,
      titleGroup: article.titleGroup,
      articleNumber: article.number,
      heading: article.heading,
      text: article.heading,
    });
    renderArticleBody(article, context).forEach((text) => {
      blocks.push({
        kind: 'article',
        sourcePage: article.sourcePage,
        titleGroup: article.titleGroup,
        articleNumber: article.number,
        text,
      });
    });
  });

  blocks.push({ kind: 'signature', sourcePage: 16, text: `Établi à ${context.execution?.city ?? '[ville]'},` });
  blocks.push({ kind: 'signature', sourcePage: 16, text: `Le ${context.execution?.date ?? '[date]'},` });
  blocks.push({ kind: 'signature', sourcePage: 16, text: `En ${context.execution?.originalsCount ?? 4} exemplaires originaux.` });
  blocks.push({
    kind: 'signature',
    sourcePage: 16,
    text: 'Chaque associé reconnaît avoir pris connaissance de l’intégralité des présents statuts et les accepter sans réserve.',
  });
  blocks.push({
    kind: 'signature',
    sourcePage: 16,
    text: 'Signatures des associés précédées de la mention : « Lu et approuvé »',
  });
  (context.associates || []).forEach((associate) => {
    blocks.push({
      kind: 'signature',
      sourcePage: 16,
      text: `${associate.fullName} - ${associate.roleLabel ?? 'Associé(e)'} - Lu et approuvé`,
    });
    if (associate.isMinor && !associate.isEmancipated && associate.legalRepresentatives?.length) {
      blocks.push({
        kind: 'signature',
        sourcePage: 16,
        text: `${associate.fullName}, mineur(e) non émancipé(e) au jour de la constitution, est représenté(e) légalement pour les besoins des présentes, jusqu'à sa majorité, par ${associate.legalRepresentatives.join(' et ')}, agissant en qualité d'administrateurs légaux conformément aux articles 382 et suivants du Code civil.`,
      });
    }
  });

  return blocks;
};

export const countWilliamArticles = (blocks) => {
  const numbers = new Set();
  blocks.forEach((block) => {
    if (typeof block.articleNumber === 'number') numbers.add(block.articleNumber);
  });
  return numbers.size;
};

export const estimatePageCount = (blocks) => {
  const pages = new Set(blocks.map((b) => b.sourcePage).filter(Boolean));
  return pages.size || loadWilliamTemplate().pageCount || 16;
};
