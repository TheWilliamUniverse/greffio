import { assistantConfig } from '../config.js';

const embeddingCache = new Map();

export const embedTextWithOllama = async (text) => {
  const input = String(text || '').trim();
  if (!input) return null;

  const cacheKey = `${assistantConfig.embeddingModel}::${input.slice(0, 500)}`;
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey);

  const baseUrl = assistantConfig.ollamaBaseUrl;
  const model = assistantConfig.embeddingModel;
  if (!baseUrl || !model) return null;

  try {
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: input }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const vector = payload?.embedding;
    if (!Array.isArray(vector) || !vector.length) return null;
    embeddingCache.set(cacheKey, vector);
    return vector;
  } catch (error) {
    console.warn('ASSISTANT_EMBEDDING_FAILED', error?.message || error);
    return null;
  }
};

export const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
