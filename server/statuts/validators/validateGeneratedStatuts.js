import { countWilliamArticles, estimatePageCount } from '../renderers/renderWilliamSas2026.js';
import { blocksContainSampleParasiteText } from '../renderers/williamParagraphSanitizer.js';
import { validateLegalEntityParties } from '../../shared/partyIdentityFormatter.js';
import {
  validateGeneratedStatutsText,
  validateStatutsCapitalModel,
} from '../shared/deriveStatutsCapital.js';

const REQUIRED_TITLES_SAS = [
  'TITRE I – FORMATION DE LA SOCIÉTÉ',
  'TITRE II – ADMINISTRATION & ORGANISATION',
  'TITRE III – DÉCISIONS COLLECTIVES',
  'TITRE IV – ACTIONS & MOUVEMENT DES TITRES',
  'TITRE V – FONCTIONNEMENT INTERNE',
  'TITRE VI – RÉSULTATS & FIN DE VIE',
  'TITRE VII – RÈGLEMENT DES LITIGES',
  'TITRE VIII – DISPOSITIONS DIVERSES',
];

const REQUIRED_TITLES_SASU = REQUIRED_TITLES_SAS.map((title) => (
  title === 'TITRE III – DÉCISIONS COLLECTIVES'
    ? "TITRE III – DÉCISIONS DE L'ASSOCIÉ UNIQUE"
    : title
));

const MIN_ARTICLES_BY_FORM = Object.freeze({
  SAS: 27,
  SASU: 25,
  SARL: 24,
  EURL: 24,
  SCI: 24,
});

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/;

export const validateGeneratedStatuts = ({ blocks = [], context = {}, legalForm = 'SAS' }) => {
  const form = String(legalForm || 'SAS').toUpperCase();
  const errors = [];
  const articleCount = countWilliamArticles(blocks);
  const minArticles = MIN_ARTICLES_BY_FORM[form] || 24;

  if (articleCount < minArticles) {
    errors.push(`Document incomplet : ${articleCount}/${minArticles} articles détectés.`);
  }

  ['preamble', 'title', 'article'].forEach((kind) => {
    if (!blocks.some((b) => b.kind === kind)) errors.push(`Bloc manquant : ${kind}.`);
  });

  if (blocksContainSampleParasiteText(blocks)) {
    errors.push('Texte parasite du modèle échantillon (noms ou clauses non issues du dossier).');
  }

  const requiredTitles = form === 'SASU' ? REQUIRED_TITLES_SASU : REQUIRED_TITLES_SAS;
  requiredTitles.forEach((title) => {
    if (!blocks.some((b) => b.kind === 'title' && String(b.text).trim() === title)) {
      errors.push(`Titre manquant : ${title}.`);
    }
  });

  blocks.forEach((block) => {
    if (block.text && PLACEHOLDER_RE.test(block.text)) {
      errors.push(`Placeholder non résolu : ${block.text.slice(0, 80)}`);
    }
  });

  const shareCount = Number(context.company?.shareCount || 0);
  const totalShares = (context.associates || []).reduce((sum, a) => sum + (Number(a.shares) || 0), 0);
  if (shareCount > 0 && totalShares > 0 && totalShares !== shareCount) {
    errors.push(`Incohérence capital/actions : ${totalShares} actions pour ${shareCount} attendues.`);
  }

  if (context.capitalModel) {
    const capitalValidation = validateStatutsCapitalModel(context.capitalModel);
    if (!capitalValidation.ok) errors.push(...capitalValidation.errors);
  }

  (context.associates || []).forEach((associate) => {
    if (associate.isMinor && !associate.isEmancipated && !(associate.legalRepresentatives?.length)) {
      errors.push(`Associé mineur non émancipé sans représentants légaux : ${associate.fullName}.`);
    }
  });

  const pmValidation = validateLegalEntityParties(
    (context.associates || []).map((associate) => ({
      associateType: associate.isLegalEntity ? 'personne_morale' : 'personne_physique',
      companyName: associate.fullName,
      label: associate.fullName,
      representativeName: associate.representativeName,
      representativeQuality: associate.representativeQuality,
    })),
  );
  if (!pmValidation.ok) {
    errors.push(...pmValidation.errors);
  }

  if (String(legalForm).toUpperCase() === 'SASU' && (context.associates?.length || 0) > 1) {
    errors.push('SASU : un seul associé attendu.');
  }

  return {
    ok: errors.length === 0,
    errors,
    articleCount,
    pageCount: estimatePageCount(blocks),
  };
};

export const assertValidGeneratedStatuts = (payload) => {
  const result = validateGeneratedStatuts(payload);
  if (!result.ok) {
    const error = new Error('STATUTES_VALIDATION_FAILED');
    error.code = 'STATUTES_VALIDATION_FAILED';
    error.validation = result;
    throw error;
  }
  return result;
};
