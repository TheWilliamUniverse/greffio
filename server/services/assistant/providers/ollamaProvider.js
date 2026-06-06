import { assistantConfig } from '../config.js';

const SYSTEM_PROMPT = `Tu es l'assistant Greffio (formalités françaises). Réponds en français, clairement, sans jargon technique ni mention de fournisseur IA.`;

export const askOllama = async ({ message, history = [], userContext = {} }) => {
  const baseUrl = assistantConfig.ollamaBaseUrl;
  const model = assistantConfig.ollamaModel;
  if (!baseUrl || !model) return null;

  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const promptParts = [
    SYSTEM_PROMPT,
    `Contexte : ${JSON.stringify(userContext || {})}`,
    ...recentHistory.map((item) => `${item.role === 'user' ? 'Client' : 'Assistant'}: ${item.content}`),
    `Client: ${message}`,
    'Assistant:',
  ];

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: promptParts.join('\n'),
        stream: false,
        options: {
          temperature: assistantConfig.temperature,
          num_predict: assistantConfig.maxTokens,
        },
      }),
    });
    if (!response.ok) return { degraded: true, reason: 'ollama_unavailable' };
    const payload = await response.json();
    const answer = String(payload?.response || '').trim();
    if (!answer) return { degraded: true, reason: 'empty' };
    return { answer, provider: 'local_ollama', model };
  } catch (error) {
    console.warn('ASSISTANT_OLLAMA_FAILED', error?.message || error);
    return { degraded: true, reason: 'ollama_error' };
  }
};
