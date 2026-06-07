export const assistantConfig = {
  primaryProvider: String(process.env.AI_PRIMARY_PROVIDER || 'openai').toLowerCase(),
  primaryModel: String(process.env.AI_PRIMARY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  secondaryProvider: String(process.env.AI_SECONDARY_PROVIDER || 'openai').toLowerCase(),
  ollamaBaseUrl: String(process.env.OLLAMA_BASE_URL || process.env.LOCAL_LLM_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
  ollamaModel: String(process.env.AI_OLLAMA_MODEL || process.env.AI_PRIMARY_MODEL || 'qwen3:8b').trim(),
  embeddingModel: String(process.env.AI_EMBEDDING_MODEL || 'bge-m3').trim(),
  enableLocalRules: process.env.AI_ENABLE_LOCAL_RULES !== 'false',
  enableProviderFallback: process.env.AI_ENABLE_PROVIDER_FALLBACK !== 'false',
  enableRag: process.env.AI_ENABLE_RAG !== 'false',
  ragTopK: Number(process.env.AI_RAG_TOP_K || 4),
  maxTokens: Number(process.env.AI_MAX_TOKENS || 700),
  temperature: Number(process.env.AI_TEMPERATURE || 0.35),
};

export const readOpenAiKey = () => String(process.env.OPENAI_API_KEY || '').trim();
