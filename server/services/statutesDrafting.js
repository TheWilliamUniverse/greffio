import { buildStatutesByLegalForm } from '../legal/statutes/index.js';

const MIN_ARTICLES = 27;

/**
 * Rédaction statutaire Greffio — modèle William strict (sans résumé IA).
 */
export const draftStatutesDocument = (statutesData) => {
  const document = buildStatutesByLegalForm(statutesData);
  const articleCount = document.metadata?.articleCount
    || document.blocks?.filter((block) => block.kind === 'article').length
    || 0;

  if (articleCount < MIN_ARTICLES) {
    const error = new Error(`STATUTES_INCOMPLETE: only ${articleCount} articles generated`);
    error.code = 'STATUTES_INCOMPLETE';
    error.articleCount = articleCount;
    throw error;
  }

  return {
    ...document,
    metadata: {
      ...document.metadata,
      articleCount,
      strictTemplate: true,
    },
  };
};
