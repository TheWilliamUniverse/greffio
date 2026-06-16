import { getKnowledgeIndex } from './knowledgeLoader.js';

const FIELD_WEIGHTS = {
  question: 4,
  intent: 3,
  canonicalAnswer: 2,
  recommendedAction: 1,
};

export const normalizeText = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const tokenize = (value = '') => {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(' ').filter((token) => token.length > 1);
};

const scoreEntry = (entry, queryTokens) => {
  if (!queryTokens.length) return 0;

  const fields = {
    question: tokenize(entry.question),
    intent: tokenize(entry.intent.replace(/_/g, ' ')),
    canonicalAnswer: tokenize(entry.canonicalAnswer),
    recommendedAction: tokenize(entry.recommendedAction),
  };

  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const fieldTokens = fields[field];
    if (!fieldTokens.length) continue;
    const fieldSet = new Set(fieldTokens);
    for (const token of queryTokens) {
      if (fieldSet.has(token)) score += weight;
    }
  }

  return score;
};

/**
 * Lexical search V1 – replaceable by embeddings later.
 * @param {string} userMessage
 * @param {{ limit?: number, minScore?: number, visibility?: string }} options
 */
export const searchKnowledgeEntries = (
  userMessage,
  { limit = 5, minScore = 2, visibility = 'CLIENT' } = {},
) => {
  const queryTokens = tokenize(userMessage);
  if (!queryTokens.length) return [];

  const visibilityFilter = String(visibility || '').toUpperCase();
  const index = getKnowledgeIndex();

  return index
    .filter((entry) => !visibilityFilter || String(entry.visibility || '').toUpperCase() === visibilityFilter)
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, queryTokens),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry, score }) => ({
      id: entry.id,
      intent: entry.intent,
      visibility: entry.visibility,
      question: entry.question,
      canonicalAnswer: entry.canonicalAnswer,
      recommendedAction: entry.recommendedAction,
      avoidAnswer: entry.avoidAnswer,
      score,
    }));
};
