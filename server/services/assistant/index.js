import { assistantConfig, readOpenAiKey } from './config.js';
import { tryLocalRulesAnswer } from './localRules.js';
import { askOpenAi, isOpenAiConfigured } from './providers/openaiProvider.js';
import { askOllama } from './providers/ollamaProvider.js';
import { professionalFallbackAnswer, sanitizeAssistantAnswer } from './responseSanitizer.js';

const finalize = ({ answer, provider, model, mode, degraded = false }) => ({
  answer: sanitizeAssistantAnswer(answer) || professionalFallbackAnswer(),
  provider,
  model: model || null,
  mode,
  degraded,
});

export const isAssistantConfigured = () => (
  isOpenAiConfigured()
  || assistantConfig.primaryProvider === 'ollama'
  || assistantConfig.primaryProvider === 'local_vllm'
);

export const askGreffioAssistant = async ({
  message,
  userContext = {},
  history = [],
}) => {
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) {
    return finalize({
      answer: professionalFallbackAnswer(userContext),
      provider: 'local_rules',
      mode: 'empty',
    });
  }

  if (assistantConfig.enableLocalRules) {
    const localAnswer = tryLocalRulesAnswer({ message: cleanMessage, userContext });
    if (localAnswer) {
      return finalize({
        answer: localAnswer,
        provider: 'local_rules',
        mode: 'rules',
      });
    }
  }

  const providers = [];
  if (assistantConfig.primaryProvider === 'ollama' || assistantConfig.primaryProvider === 'local_vllm') {
    providers.push('ollama');
  }
  if (assistantConfig.primaryProvider === 'openai' || readOpenAiKey()) {
    providers.push('openai');
  }
  if (assistantConfig.enableProviderFallback) {
    if (!providers.includes('ollama')) providers.push('ollama');
    if (!providers.includes('openai') && readOpenAiKey()) providers.push('openai');
  }

  for (const providerName of providers) {
    const result = providerName === 'ollama'
      ? await askOllama({ message: cleanMessage, history, userContext })
      : await askOpenAi({ message: cleanMessage, history, userContext });

    if (result?.answer) {
      return finalize({
        answer: result.answer,
        provider: result.provider,
        model: result.model,
        mode: 'llm',
        degraded: Boolean(result.degraded),
      });
    }
  }

  return finalize({
    answer: professionalFallbackAnswer(userContext),
    provider: 'local_fallback',
    mode: 'fallback',
    degraded: true,
  });
};
