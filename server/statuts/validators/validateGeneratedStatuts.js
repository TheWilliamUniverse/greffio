import { countWilliamArticles, estimatePageCount } from '../renderers/renderWilliamSas2026.js';
import { blocksContainSampleParasiteText } from '../renderers/williamParagraphSanitizer.js';

const REQUIRED_TITLES = [
  'TITRE I – FORMATION DE LA SOCIÉTÉ',
  'TITRE II – ADMINISTRATION & ORGANISATION',
  'TITRE III – DÉCISIONS COLLECTIVES',
  'TITRE IV – ACTIONS & MOUVEMENT DES TITRES',
  'TITRE V – FONCTIONNEMENT INTERNE',
  'TITRE VI – RÉSULTATS & FIN DE VIE',
  'TITRE VII – RÈGLEMENT DES LITIGES',
  'TITRE VIII – DISPOSITIONS DIVERSES',
];

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/;

export const validateGeneratedStatuts = ({ blocks = [], context = {}, legalForm = 'SAS' }) => {
  const errors = [];
  const articleCount = countWilliamArticles(blocks);

  if (articleCount < 27) {
    errors.push(`Document incomplet : ${articleCount}/27 articles détectés.`);
  }

  ['preamble', 'title', 'article'].forEach((kind) => {
    if (!blocks.some((b) => b.kind === kind)) errors.push(`Bloc manquant : ${kind}.`);
  });

  if (blocksContainSampleParasiteText(blocks)) {
    errors.push('Texte parasite du modèle échantillon (noms ou clauses non issues du dossier).');
  }

  REQUIRED_TITLES.forEach((title) => {
    if (!blocks.some((b) => b.kind === 'title' && String(b.text).trim() === title)) {
      errors.push(`Titre manquant : ${title}.`);
    }
  });

  blocks.forEach((block) => {
    if (block.text && PLACEHOLDER_RE.test(block.text)) {
      errors.push(`Placeholder non résolu : ${block.text.slice(0, 80)}`);
    }
  });

  const capital = Number(context.company?.capitalAmount || 0);
  const totalShares = (context.associates || []).reduce((sum, a) => sum + (Number(a.shares) || 0), 0);
  if (capital > 0 && totalShares > 0 && totalShares !== capital) {
    errors.push(`Incohérence capital/actions : capital ${capital}, total actions ${totalShares}.`);
  }

  (context.associates || []).forEach((associate) => {
    if (associate.isMinor && !associate.isEmancipated && !(associate.legalRepresentatives?.length)) {
      errors.push(`Associé mineur non émancipé sans représentants légaux : ${associate.fullName}.`);
    }
  });

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
