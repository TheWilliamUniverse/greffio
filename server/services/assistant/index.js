import { assistantConfig, readOpenAiKey } from './config.js';
import { tryLocalRulesAnswer } from './localRules.js';
import { askOpenAi, isOpenAiConfigured } from './providers/openaiProvider.js';
import { askOllama } from './providers/ollamaProvider.js';
import { professionalFallbackAnswer, sanitizeAssistantAnswer } from './responseSanitizer.js';
import { buildUserDossierContext } from './dossierContextBuilder.js';
import { classifyDossierIntent } from './intentClassifier.js';
import { retrieveKnowledgeChunks } from './rag/retriever.js';
import { searchKnowledgeEntries } from '../../assistant/knowledgeSearch.js';

const finalize = ({ answer, provider, model, mode, degraded = false, intent = null }) => ({
  answer: sanitizeAssistantAnswer(answer) || professionalFallbackAnswer(),
  provider,
  model: model || null,
  mode,
  degraded,
  intent: intent?.id || null,
});

export const isAssistantConfigured = () => (
  isOpenAiConfigured()
  || assistantConfig.primaryProvider === 'ollama'
  || assistantConfig.primaryProvider === 'local_vllm'
);

const buildEnrichedContext = async ({ message, userContext = {}, dossierId = null }) => {
  const dossierBlock = userContext.dossier?.dossierId || userContext.dossier?.hasDossier
    ? userContext.dossier
    : userContext.userId
      ? await buildUserDossierContext({ userId: userContext.userId, dossierId })
      : { hasDossier: false };
  const dossier = dossierBlock.hasDossier || dossierBlock.dossierId ? dossierBlock : null;
  const intent = classifyDossierIntent({ message, dossierContext: dossierBlock });

  let knowledgeSnippets = userContext.knowledgeSnippets;
  if (!knowledgeSnippets?.length) {
    const lexicalMatches = searchKnowledgeEntries(message, { limit: 4, minScore: 2, visibility: 'CLIENT' });
    if (lexicalMatches.length) {
      knowledgeSnippets = lexicalMatches.map((item) => `[${item.id}] ${item.canonicalAnswer.slice(0, 280)}`);
    } else if (assistantConfig.enableRag) {
      const knowledge = await retrieveKnowledgeChunks({
        query: message,
        intent: intent.id,
        topK: assistantConfig.ragTopK,
      });
      knowledgeSnippets = knowledge.map((item) => item.text);
    } else {
      knowledgeSnippets = [];
    }
  }

  return {
    ...userContext,
    dossier: dossierBlock,
    intent: intent.id,
    intentLabel: intent.label,
    knowledgeSnippets,
    legalStructure: userContext.legalStructure || dossierBlock.legalForm || null,
    company: userContext.company || (dossierBlock.companyName ? { name: dossierBlock.companyName, legalForm: dossierBlock.legalForm } : null),
  };
};

export const askGreffioAssistant = async ({
  message,
  userContext = {},
  history = [],
  dossierId = null,
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
    const quickAnswer = tryLocalRulesAnswer({
      message: cleanMessage,
      userContext: {
        ...userContext,
        legalStructure: userContext.legalStructure || userContext?.company?.legalForm || null,
      },
    });
    if (quickAnswer) {
      return finalize({
        answer: quickAnswer,
        provider: 'local_rules',
        mode: 'rules_fast',
      });
    }
  }

  const dossierBlock = userContext.userId
    ? await buildUserDossierContext({ userId: userContext.userId, dossierId })
    : { hasDossier: false };

  if (assistantConfig.enableLocalRules && dossierBlock.hasDossier) {
    const dossierAnswer = tryLocalRulesAnswer({
      message: cleanMessage,
      userContext: { ...userContext, dossier: dossierBlock, legalStructure: dossierBlock.legalForm },
    });
    if (dossierAnswer) {
      return finalize({
        answer: dossierAnswer,
        provider: 'local_rules',
        mode: 'rules_dossier',
      });
    }
  }

  const enrichedContext = await buildEnrichedContext({
    message: cleanMessage,
    userContext,
    dossierId,
  });
  const intent = { id: enrichedContext.intent, label: enrichedContext.intentLabel };

  if (assistantConfig.enableLocalRules) {
    const localAnswer = tryLocalRulesAnswer({ message: cleanMessage, userContext: enrichedContext });
    if (localAnswer) {
      return finalize({
        answer: localAnswer,
        provider: 'local_rules',
        mode: 'rules',
        intent,
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
      ? await askOllama({ message: cleanMessage, history, userContext: enrichedContext })
      : await askOpenAi({ message: cleanMessage, history, userContext: enrichedContext });

    if (result?.answer) {
      return finalize({
        answer: result.answer,
        provider: result.provider,
        model: result.model,
        mode: 'llm',
        degraded: Boolean(result.degraded),
        intent,
      });
    }
  }

  return finalize({
    answer: professionalFallbackAnswer(enrichedContext),
    provider: 'local_fallback',
    mode: 'fallback',
    degraded: true,
    intent,
  });
};
