import { askGreffioAssistant, isAssistantConfigured } from '../services/assistant.js';
import { initializeKnowledgeIndex } from './knowledgeLoader.js';
import { buildAssistantContext, buildKnowledgeOnlyAnswer } from './contextBuilder.js';
import { sanitizeAssistantOutput, PRUDENT_FALLBACK } from './assistantPolicy.js';

const MAX_MESSAGE_LENGTH = 2000;
const HIGH_CONFIDENCE_SCORE = 10;

initializeKnowledgeIndex();

const sanitizeMessage = (message) => {
  const clean = String(message || '').trim().slice(0, MAX_MESSAGE_LENGTH);
  return clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

const computeConfidence = ({
  knowledgeMatches = [],
  dossierContext = null,
  provider = null,
  degraded = false,
  directKnowledge = false,
}) => {
  if (directKnowledge && knowledgeMatches[0]?.score >= HIGH_CONFIDENCE_SCORE) return 'high';
  if (dossierContext?.actionState && knowledgeMatches.length) return 'high';
  if (dossierContext?.actionState) return 'medium';
  if (knowledgeMatches[0]?.score >= 6) return 'medium';
  if (provider === 'local_fallback' || degraded) return 'low';
  return 'medium';
};

const buildSources = (knowledgeMatches = []) => knowledgeMatches.slice(0, 3).map((match) => ({
  type: 'knowledge',
  id: match.id,
  intent: match.intent,
}));

const composeDossierAwareAnswer = (context) => {
  const { dossierContext, rawKnowledgeMatches = context.knowledgeMatches } = context;
  const action = dossierContext?.actionState;
  const knowledgeAnswer = buildKnowledgeOnlyAnswer(rawKnowledgeMatches);

  if (action?.label && action?.description) {
    const parts = [
      `D'après l'état actuel de votre dossier : ${action.description}`,
      `Prochaine étape recommandée : ${action.label}.`,
    ];
    if (action.blocking) {
      parts.push(`Point bloquant : ${action.blocking}.`);
    }
    if (knowledgeAnswer && rawKnowledgeMatches[0]?.score >= 4) {
      parts.push(knowledgeAnswer);
    }
    return parts.join(' ');
  }

  return knowledgeAnswer;
};

/**
 * @param {{
 *   message: string,
 *   history?: object[],
 *   dossierId?: string | null,
 *   route?: string | null,
 *   userContext?: { userId?: string, role?: string, email?: string },
 * }} input
 */
export const handleAssistantRequest = async ({
  message,
  history = [],
  dossierId = null,
  route = null,
  userContext = {},
} = {}) => {
  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) {
    return {
      answer: PRUDENT_FALLBACK,
      suggestedActions: [],
      sources: [],
      confidence: 'low',
      provider: 'local_rules',
      model: null,
      intent: null,
      configured: isAssistantConfigured(),
      degraded: false,
    };
  }

  const context = await buildAssistantContext({
    userMessage: cleanMessage,
    route,
    userId: userContext.userId || null,
    dossierId: dossierId ? String(dossierId) : null,
  });

  if (context.dossierAccessError) {
    return {
      answer: 'Je ne peux pas accéder à ce dossier. Vérifiez que vous consultez bien votre propre dossier Greffio.',
      suggestedActions: [{ type: 'navigation', label: 'Voir mes dossiers', url: '/dossiers' }],
      sources: [],
      confidence: 'high',
      provider: 'policy',
      model: null,
      intent: null,
      configured: isAssistantConfigured(),
      degraded: false,
    };
  }

  if (context.requiresDossierSelection) {
    return {
      answer: context.selectDossierPrompt,
      suggestedActions: [{ type: 'navigation', label: 'Ouvrir mes dossiers', url: '/dossiers' }],
      sources: buildSources(context.knowledgeMatches),
      confidence: 'high',
      provider: 'policy',
      model: null,
      intent: context.knowledgeMatches[0]?.intent || null,
      configured: isAssistantConfigured(),
      degraded: false,
    };
  }

  const topMatch = context.rawKnowledgeMatches?.[0] || context.knowledgeMatches[0];
  const canUseDirectKnowledge = !context.dossierSpecific
    && topMatch
    && topMatch.score >= HIGH_CONFIDENCE_SCORE;

  if (canUseDirectKnowledge) {
    const answer = sanitizeAssistantOutput(topMatch.canonicalAnswer, context.rawKnowledgeMatches || context.knowledgeMatches);
    return {
      answer,
      suggestedActions: context.allowedActions,
      sources: buildSources(context.knowledgeMatches),
      confidence: computeConfidence({
        knowledgeMatches: context.knowledgeMatches,
        directKnowledge: true,
      }),
      provider: 'knowledge_base',
      model: null,
      intent: topMatch.intent || null,
      configured: isAssistantConfigured(),
      degraded: false,
    };
  }

  if (context.dossierSpecific && context.dossierContext?.actionState) {
    const dossierAnswer = composeDossierAwareAnswer(context);
    if (dossierAnswer) {
      const answer = sanitizeAssistantOutput(dossierAnswer, context.knowledgeMatches);
      return {
        answer,
        suggestedActions: context.allowedActions,
        sources: buildSources(context.knowledgeMatches),
        confidence: computeConfidence({
          knowledgeMatches: context.knowledgeMatches,
          dossierContext: context.dossierContext,
        }),
        provider: 'dossier_state',
        model: null,
        intent: context.dossierContext.actionState.kind || topMatch?.intent || null,
        configured: isAssistantConfigured(),
        degraded: false,
      };
    }
  }

  const llmResult = await askGreffioAssistant({
    message: cleanMessage,
    history: Array.isArray(history) ? history : [],
    dossierId: dossierId ? String(dossierId) : context.dossierContext?.dossierId || null,
    userContext: {
      ...userContext,
      route: context.route,
      dossier: context.dossierContext,
      knowledgeSnippets: context.knowledgeSnippets,
      assistantPolicy: context.policy,
      allowedActions: context.allowedActions,
    },
  });

  const answer = sanitizeAssistantOutput(llmResult.answer, context.knowledgeMatches);

  return {
    answer,
    suggestedActions: context.allowedActions,
    sources: buildSources(context.knowledgeMatches),
    confidence: computeConfidence({
      knowledgeMatches: context.knowledgeMatches,
      dossierContext: context.dossierContext,
      provider: llmResult.provider,
      degraded: llmResult.degraded,
    }),
    provider: llmResult.provider,
    model: llmResult.model,
    intent: llmResult.intent || topMatch?.intent || null,
    configured: isAssistantConfigured(),
    degraded: Boolean(llmResult.degraded),
  };
};
