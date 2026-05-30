import { buildStatutesByLegalForm } from '../legal/statutes/index.js';

const MIN_ARTICLES_BY_FORM = Object.freeze({
  SAS: 27,
  SASU: 25,
  SARL: 24,
  EURL: 24,
  SCI: 24,
});

export const draftStatutesDocument = (statutesData) => {
  const document = buildStatutesByLegalForm(statutesData);
  const legalForm = String(statutesData?.legalForm || document.metadata?.legalForm || 'SASU').toUpperCase();
  const minArticles = MIN_ARTICLES_BY_FORM[legalForm] || 24;
  const articleCount = document.metadata?.articleCount
    || document.blocks?.filter((block) => block.kind === 'article').length
    || 0;

  if (articleCount < minArticles) {
    const error = new Error(`STATUTES_INCOMPLETE: only ${articleCount} articles generated (minimum ${minArticles})`);
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
