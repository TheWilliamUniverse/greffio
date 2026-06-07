export const assistantConfig = {
  primaryProvider: String(process.env.AI_PRIMARY_PROVIDER || 'ollama').toLowerCase(),
  primaryModel: String(process.env.AI_PRIMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  secondaryProvider: String(process.env.AI_SECONDARY_PROVIDER || 'openai').toLowerCase(),
  ollamaBaseUrl: String(process.env.OLLAMA_BASE_URL || process.env.LOCAL_LLM_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
  ollamaModel: String(
    process.env.AI_OLLAMA_MODEL
    || process.env.OLLAMA_CHAT_MODEL
    || 'qwen2.5:7b',
  ).trim(),
  embeddingModel: String(process.env.AI_EMBEDDING_MODEL || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text').trim(),
  enableLocalRules: process.env.AI_ENABLE_LOCAL_RULES !== 'false',
  enableProviderFallback: process.env.AI_ENABLE_PROVIDER_FALLBACK !== 'false',
  enableRag: process.env.AI_ENABLE_RAG !== 'false',
  ragTopK: Number(process.env.AI_RAG_TOP_K || 3),
  maxTokens: Number(process.env.AI_MAX_TOKENS || 450),
  temperature: Number(process.env.AI_TEMPERATURE || 0.2),
};

export const readOpenAiKey = () => String(process.env.OPENAI_API_KEY || '').trim();
