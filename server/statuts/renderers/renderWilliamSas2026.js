import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeWilliamTemplateParagraphs, personalizeWilliamTemplateParagraphs } from './williamParagraphSanitizer.js';
import { formatFrEuros, formatFrInteger, parseFrenchAmount } from '../shared/numberFormat.js';
import { mergeWrapFragments } from '../shared/normalizeStatutesParagraphs.js';
import { formatStatutesFrenchDate, formatStatutesFiscalEnd } from '../shared/statutesDates.js';
import { personalizeTribunalMentions, resolveTribunalCommerce } from '../shared/resolveTribunalCommerce.js';
import { formatLegalEntityAssociateDescription } from '../shared/formatLegalEntityAssociate.js';
import { formatStatutesPersonDisplayName } from '../../shared/partyIdentityFormatter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '../templates/williamEstablishmentsSas2026.model.json');

let cachedTemplate = null;
export const loadWilliamTemplate = () => {
  if (!cachedTemplate) {
    cachedTemplate = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
  }
  return cachedTemplate;
};

const formatBirthDateFr = (value) => {
  const formatted = formatStatutesFrenchDate(value);
  return formatted || null;
};

const formatPhysicalAssociatePreambleLine = (associate) => {
  const civility = String(associate.civility || '').trim();
  const isFemale = /^mme/i.test(civility);
  const prefix = isFemale ? 'Madame' : (/^m/i.test(civility) ? 'Monsieur' : '');
  const displayName = associate.fullName || formatStatutesPersonDisplayName(associate);
  const birthDate = formatBirthDateFr(associate.birthDate);
  const bornLabel = isFemale ? 'née' : 'né';
  const identity = [
    prefix ? `${prefix} ${displayName}` : displayName,
    associate.address ? `demeurant ${associate.address}` : undefined,
    birthDate || associate.birthPlace
      ? `${bornLabel} le ${birthDate ?? '[date à compléter]'}${associate.birthPlace ? ` à ${associate.birthPlace}` : ''}`
      : undefined,
    associate.nationality ? `de nationalité ${associate.nationality}` : undefined,
    associate.isMinor && associate.isEmancipated ? 'mineur émancipé' : undefined,
    associate.isMinor && !associate.isEmancipated ? 'mineur non émancipé' : undefined,
  ].filter(Boolean).join(', ');
  return `${identity}.`;
};

const resolvePresidentLine = (context) => {
  const presidentRef = String(context.officers?.president || '').trim();
  if (!presidentRef) return 'Le Président est [Président à compléter].';
  const presidentAssociate = (context.associates || []).find(
    (associate) => associate.isLegalEntity && (
      associate.fullName === presidentRef
      || presidentRef.includes(associate.fullName)
      || associate.fullName.includes(presidentRef)
    ),
  );
  if (presidentAssociate?.representativeName && presidentAssociate?.representativeQuality) {
    return `Le Président est ${presidentAssociate.fullName}, représentée par ${presidentAssociate.representativeName}, en qualité de ${presidentAssociate.representativeQuality}.`;
  }
  return `Le Président est ${presidentRef}.`;
};

const resolveDirectorGeneralLine = (context) => {
  const directorRef = String(context.officers?.directorGeneral || '').trim();
  if (!directorRef) return null;
  const directorAssociate = (context.associates || []).find(
    (associate) => !associate.isLegalEntity && (
      associate.fullName === directorRef
      || directorRef.includes(associate.fullName)
      || associate.fullName.includes(directorRef)
    ),
  );
  const displayName = directorAssociate?.fullName || formatStatutesPersonDisplayName({ label: directorRef });
  return `Le Directeur Général est ${displayName}.`;
};

const formatCashApportLine = (associate, context) => {
  const amount = associate.cashContributionFormatted;
  if (!amount) return null;
  const liberationPct = associate.liberationPercent
    ?? context.capitalModel?.liberationPercent
    ?? parseFrenchAmount(String(context.apports?.liberationRate || '').replace('%', ''))
    ?? 50;
  const rateLabel = associate.liberationRateLabel ?? context.apports?.liberationRate ?? `${liberationPct} %`;
  if (liberationPct >= 100) {
    return `Apport en numéraire de ${amount}, entièrement libérés lors de la constitution.`;
  }
  return `Apport en numéraire de ${amount}, libéré à hauteur de ${rateLabel} lors de la constitution, soit ${associate.cashReleasedFormatted ?? '[montant libéré à compléter]'}.`;
};

const ARTICLE_74_VARIANTS = {
  full: {
    title: '7.4 Libération intégrale des apports',
    text: 'Les apports en numéraire sont intégralement libérés lors de la constitution de la Société. En conséquence, aucun appel complémentaire de fonds n\'est prévu au titre des apports souscrits à la date des présents statuts.',
  },
  partial: {
    title: '7.4 Libération partielle des apports',
    text: 'Les apports en numéraire qui ne sont pas intégralement libérés lors de la constitution de la Société seront libérés sur appel du Président, dans les conditions prévues par la loi et dans un délai maximal de cinq années à compter de l\'immatriculation de la Société.',
  },
  differentiated: {
    title: '7.4 Libération partielle et différenciée des apports',
    text: 'Les apports en numéraire peuvent être libérés selon des proportions distinctes pour chaque associé, dès lors que les montants effectivement libérés sont clairement identifiés aux présents statuts et respectent les exigences légales applicables. Les fractions non libérées seront appelées par le Président dans les conditions prévues par la loi et dans un délai maximal de cinq années à compter de l\'immatriculation de la Société.',
  },
};

const renderArticle74 = (context) => {
  const variant = context.capitalModel?.liberationArticle74Variant || 'partial';
  const block = ARTICLE_74_VARIANTS[variant] || ARTICLE_74_VARIANTS.partial;
  return [`${block.title} :`, block.text];
};

const renderDefinitionsAndObjetActe = (context) => {
  const unique = (context.associates || []).length <= 1;
  const associateLabel = unique
    ? `Associé unique : désigne ${context.associates?.[0]?.fullName || "l'associé identifié aux présentes"}.`
    : 'Associé(s) : désigne toute personne physique ou morale titulaire d\'au moins une action dans la Société, à la date de constitution ou ultérieurement.';
  const lines = [
    'Définitions',
    'Aux fins des présents statuts, les termes ci-dessous ont la signification suivante :',
    associateLabel,
    'Dirigeant(s) : désigne le Président de la Société, ainsi que tout Directeur Général nommé par la Société.',
    `Société : désigne la ${context.company?.legalFormLabel || 'Société par Actions Simplifiée'} en formation, régie par les présents statuts et les textes juridiques en vigueur, et destinée à acquérir la personnalité morale à son immatriculation au Registre du Commerce et des Sociétés.`,
    'Objet du présent acte',
    unique
      ? 'L\'associé unique convient d\'établir les présents statuts, qui régissent l\'organisation, et le fonctionnement de la Société.'
      : 'Les Associés conviennent d\'établir entre eux les présents statuts, qui régissent l\'organisation, et le fonctionnement de la Société.',
    unique
      ? 'Ces statuts s\'appliquent également à toute personne qui deviendrait ultérieurement associé de la Société.'
      : 'Ces statuts s\'appliquent également à toute personne qui deviendrait ultérieurement Associé.',
    'IL A ÉTÉ CONVENU ET DÉCIDÉ CE QUI SUIT :',
  ];
  return lines;
};

export const renderAssociatesPreamble = (context) => {
  const associates = context.associates || [];
  const unique = associates.length <= 1;
  const lines = [unique ? 'L\'ASSOCIÉ UNIQUE :' : 'LES SOUSSIGNÉS :'];
  associates.forEach((associate, index) => {
    if (index > 0 && !unique) lines.push('ET');
    if (associate.isLegalEntity) {
      lines.push(formatLegalEntityAssociateDescription(associate, {
        greffeCity: context.jurisdiction?.greffeCity || context.company?.rcsCity,
        includeRepresentative: true,
      }));
      return;
    }
    lines.push(formatPhysicalAssociatePreambleLine(associate));
    if (associate.isMinor && !associate.isEmancipated && associate.legalRepresentatives?.length) {
      lines.push(`Représenté(e) légalement par ${associate.legalRepresentatives.join(' et ')}, jusqu'à sa majorité.`);
    }
  });
  if (!unique && associates.length > 1) {
    lines.push('Ci-après dénommés collectivement « les Associés »,');
  }
  return lines;
};

export const renderCapitalDistribution = (context) => {
  const lines = ['La répartition du capital est la suivante :'];
  (context.associates || []).forEach((associate) => {
    const percent = associate.sharePercentage != null
      ? `${associate.sharePercentage}% des actions`
      : '[pourcentage à compléter]';
    const shares = associate.shares != null
      ? `soit ${formatFrInteger(associate.shares)} actions`
      : '[nombre d\'actions à compléter]';
    lines.push(`${associate.fullName} : ${percent}, ${shares}.`);
  });
  return lines;
};

export const renderApports = (context) => {
  const lines = [];
  const inKindTotal = context.apports?.inKindTotalAmount ?? parseFrenchAmount(context.apports?.inKindTotalFormatted);
  lines.push(`Les associés apportent en numéraire la somme de ${context.apports?.cashTotalFormatted ?? '[montant à compléter]'}.`);
  if (!inKindTotal) {
    lines.push('Il n\'y a aucun apport en nature.');
  } else {
    lines.push(`Les apports en nature sont chiffrés à ${context.apports?.inKindTotalFormatted ?? '[montant à compléter]'}.`);
  }
  (context.associates || []).forEach((associate, index) => {
    lines.push(`7.${index + 1} Apports de ${associate.fullName} :`);
    const cashLine = formatCashApportLine(associate, context);
    if (cashLine) lines.push(cashLine);
    if (associate.inKindContributions?.length) {
      lines.push(`Apports en nature : ${associate.inKindContributions.map((item) => `${item.label} (${item.valueFormatted})`).join(', ')}.`);
      const total = associate.inKindContributions
        .map((item) => parseFrenchAmount(item.valueFormatted))
        .reduce((a, b) => a + b, 0);
      lines.push(`Total apports en nature : ${formatFrInteger(total)} euros.`);
    } else {
      lines.push('Pas d\'apports en nature.');
    }
    if (associate.isMinor && !associate.isEmancipated) {
      lines.push('Étant mineur(e) non émancipé(e) au jour de la constitution, la souscription et la libération sont réalisées pour son compte par ses représentants légaux conformément à l\'article 382 du Code civil.');
    }
  });
  lines.push('Les associés ont décidé de ne pas recourir à un commissaire aux apports conformément à la loi.');
  lines.push(...renderArticle74(context));
  lines.push('7.5 Dépôt des fonds :');
  lines.push(`La somme de ${context.apports?.depositedFundsFormatted ?? '[montant à compléter]'}, correspondant aux apports en numéraire libérés à la constitution est déposée sur un compte ouvert au nom de la société en formation, attesté par le dépositaire.`);
  return lines;
};

const renderArticle6 = (context) => {
  const minors = (context.associates || []).filter((a) => a.isMinor);
  if (!minors.length) {
    return ['Les associés exercent leurs droits dans les conditions prévues par la loi et par les présents statuts.'];
  }
  const lines = [];
  if (minors.some((a) => a.isEmancipated)) {
    lines.push(
      'L\'associé mineur émancipé peut exercer pleinement ses droits d\'associé dans la Société, notamment en matière de vote, de gestion et de représentation, conformément aux dispositions légales en vigueur.',
      'L\'émancipation ne dispense pas, en conséquence, l\'associé mineur des obligations statutaires et légales liées à sa qualité d\'associé.',
    );
  }
  if (minors.some((a) => !a.isEmancipated)) {
    lines.push(
      'L\'associé mineur non émancipé exerce ses droits sociaux par l\'intermédiaire de ses représentants légaux.',
      'Les représentants légaux agissent pour le compte de l\'associé mineur dans tous les actes relatifs à la Société, notamment vote, souscription, cession, décision collective.',
      'Toute décision engageant significativement le patrimoine de l\'associé mineur devra respecter les dispositions du Code civil relatives à l\'administration légale des biens des mineurs.',
    );
  }
  return lines;
};

const renderArticle27 = (context) => {
  const tribunal = context?.jurisdiction?.tribunalCommerce
    || resolveTribunalCommerce({ greffe: context?.company?.rcsCity, seat: { city: context?.company?.rcsCity } }).label;
  return [
    'Les associés conviennent que les dispositions suivantes s\'appliquent :',
    '27.1 - Langue officielle des documents juridiques :',
    'Conformément à l\'article 2 de la Constitution française, la langue officielle des statuts et de tous les documents juridiques de la Société, tels que les procès-verbaux, registres et correspondances, est le français. En cas de traduction, seule la version française fait foi.',
    '27.2 - Droit applicable et Tribunal compétent :',
    'Les statuts sont soumis au droit français.',
    `En cas de litige, compétence exclusive est attribuée au ${tribunal}.`,
    '27.3 - Frais de constitution avancés par les associés :',
    'Tous les frais, droits et honoraires engagés pour la constitution de la Société sont avancés par les associés agissant au nom et pour le compte de la Société en formation. Le détail de ces frais figure en annexe aux présents statuts.',
    'Ces sommes donnent lieu à ouverture d\'un compte courant d\'associé au bénéfice des associés ayant supporté ces dépenses.',
    'La Société rembourse ces avances dans un délai raisonnable à compter de son immatriculation au Registre du Commerce et des Sociétés, sous réserve de justification des dépenses.',
    '27.4 - Disposition transitoire :',
    'La Société accepte l\'usage de la signature électronique pour les convocations, consultations écrites et signatures de procès-verbaux, dans les conditions prévues par la loi.',
  ];
};

const renderArticleBody = (article, context) => {
  let lines = [];

  switch (article.number) {
    case 1:
      lines = [`Il est formé une Société par Actions Simplifiée dénommée ${context.company.name}${context.company.sigle ? `, et de sigle ${context.company.sigle}` : ''}.`];
      break;
    case 2: {
      const bullets = context.objectSocialBullets?.length
        ? context.objectSocialBullets
        : sanitizeWilliamTemplateParagraphs(article.paragraphs).slice(1, -2);
      lines = [
        'La Société a pour objet social, directement ou indirectement, tant en France qu\'à l\'étranger :',
        ...bullets,
        `${context.company.name} est habilitée à exercer ses activités sous toute enseigne, marque ou nom commercial de son choix, et à commercialiser tous biens ou services non réglementés, directement ou indirectement, à ses clients dans ses marchés.`,
        'Et plus généralement, toutes opérations industrielles, commerciales, financières, mobilières et/ou immobilières se rapportant directement ou indirectement à l\'objet social ci-dessus et à tous objets ou connexes pouvant favoriser son développement.',
      ];
      break;
    }
    case 3:
      lines = [`Le siège social est fixé au ${context.company.registeredOffice}.`];
      break;
    case 4:
      lines = [`La Société est constituée pour une durée de ${context.company.durationYears ?? 99} années à compter de son immatriculation au Registre du Commerce et des Sociétés, sauf dissolution anticipée ou prorogation.`];
      break;
    case 5: {
      const shareCount = context.company.shareCount || context.company.capitalAmount;
      const nominalLabel = context.company.nominalValueFormatted || formatFrInteger(context.company.nominalValue || 1);
      lines = [
        `Le capital social est fixé à la somme de ${context.company.capitalFormatted}, divisé en ${formatFrInteger(shareCount)} actions de ${nominalLabel} euro${Number(context.company.nominalValue || 1) > 1 ? 's' : ''} chacune.`,
        ...(context.options?.variableCapital ? [
          `Le capital est variable conformément aux articles L.231-1 à L.231-8 du Code de commerce, avec un minimum de ${context.options.capitalMinFormatted ?? '[minimum à compléter]'} et un maximum de ${context.options.capitalMaxFormatted ?? '[maximum à compléter]'}.`,
          'Les augmentations ou réductions dans la fourchette du capital variable sont décidées par décision collective ordinaire des associés. Celles-ci sont constatées par le Président au registre, sans modification statutaire.',
        ] : []),
        ...renderCapitalDistribution(context),
        `L'exercice social se termine le ${formatStatutesFiscalEnd(context.company.fiscalYearEnd) || '[date à compléter]'} de chaque année et recommence le jour suivant.`,
        `Par exception, le premier exercice sera clôturé le ${formatStatutesFiscalEnd(context.company.firstFiscalYearEnd) || '[date à compléter]'}.`,
      ];
      break;
    }
    case 6:
      lines = renderArticle6(context);
      break;
    case 7:
      lines = renderApports(context);
      break;
    case 8: {
      lines = [
        'La société est dirigée par un Président nommé par décision collective des associés.',
        resolvePresidentLine(context),
      ];
      const directorLine = resolveDirectorGeneralLine(context);
      if (directorLine) lines.push(directorLine);
      break;
    }
    case 9: {
      const sanitized = personalizeWilliamTemplateParagraphs(article.paragraphs, context);
      lines = !context.officers?.directorGeneral
        ? sanitized.filter((p) => !/Directeur Général est investi/i.test(p))
        : sanitized;
      break;
    }
    case 27:
      lines = renderArticle27(context);
      break;
    default:
      lines = personalizeWilliamTemplateParagraphs(article.paragraphs, context);
  }

  return mergeWrapFragments(lines);
};

export const renderWilliamSas2026Blocks = (context) => {
  const template = loadWilliamTemplate();
  const blocks = [];

  renderAssociatesPreamble(context).forEach((text) => {
    blocks.push({ kind: 'preamble', sourcePage: 2, text });
  });

  renderDefinitionsAndObjetActe(context).forEach((text) => {
    blocks.push({ kind: 'preamble', sourcePage: 2, text });
  });

  let lastTitleGroup = '';
  template.articles.forEach((article) => {
    if (article.titleGroup !== lastTitleGroup) {
      blocks.push({
        kind: 'title',
        sourcePage: article.sourcePage,
        text: article.titleGroup,
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
  const template = loadWilliamTemplate();
  const fromBlocks = new Set(blocks.map((b) => b.sourcePage).filter(Boolean)).size;
  return Math.max(fromBlocks, template.pageCount || 16);
};
