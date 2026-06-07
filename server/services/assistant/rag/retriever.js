import { GREFFIO_KNOWLEDGE_CHUNKS } from './knowledgeChunks.js';
import { assistantConfig } from '../config.js';
import { cosineSimilarity, embedTextWithOllama } from './embeddings.js';

const chunkVectorCache = new Map();

const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const scoreChunkByKeywords = (chunk, query, intent) => {
  const text = normalize(`${query} ${intent || ''}`);
  let score = 0;
  for (const topic of chunk.topics || []) {
    if (text.includes(normalize(topic))) score += 2;
  }
  if (intent && chunk.topics?.includes(intent)) score += 3;
  return score;
};

const ensureChunkVectors = async () => {
  if (chunkVectorCache.size >= GREFFIO_KNOWLEDGE_CHUNKS.length) return;
  for (const chunk of GREFFIO_KNOWLEDGE_CHUNKS) {
    if (chunkVectorCache.has(chunk.id)) continue;
    const vector = await embedTextWithOllama(chunk.text);
    if (vector) chunkVectorCache.set(chunk.id, vector);
  }
};

export const retrieveKnowledgeChunks = async ({ query = '', intent = 'general', topK = 4 } = {}) => {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return [];

  const keywordScored = GREFFIO_KNOWLEDGE_CHUNKS
    .map((chunk) => ({
      ...chunk,
      score: scoreChunkByKeywords(chunk, cleanQuery, intent),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (keywordScored[0]?.score >= 3) {
    return keywordScored.slice(0, topK);
  }

  if (!assistantConfig.enableRag) {
    return keywordScored.slice(0, topK);
  }

  await ensureChunkVectors();
  const queryVector = await embedTextWithOllama(cleanQuery);
  if (!queryVector) {
    return keywordScored.slice(0, topK);
  }

  const semanticScored = GREFFIO_KNOWLEDGE_CHUNKS.map((chunk) => {
    const vector = chunkVectorCache.get(chunk.id);
    const semantic = vector ? cosineSimilarity(queryVector, vector) : 0;
    const keyword = scoreChunkByKeywords(chunk, cleanQuery, intent) * 0.05;
    return { ...chunk, score: semantic + keyword };
  }).sort((a, b) => b.score - a.score);

  return semanticScored.filter((item) => item.score > 0.15).slice(0, topK);
};
