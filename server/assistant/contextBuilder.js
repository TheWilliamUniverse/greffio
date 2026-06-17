import { resolveDossierActionState } from '../domain/dossierActionState.js';
import { getDossier, listDossierDocuments } from '../store.js';
import { filterClientVisibleDocuments } from '../domain/clientDocuments.js';
import { searchKnowledgeEntries } from './knowledgeSearch.js';
import { ASSISTANT_POLICY, SELECT_DOSSIER_PROMPT } from './assistantPolicy.js';
import {
  isInternalRecommendedAction,
  polishFrenchClientText,
  resolveClientFacingActionLabel,
} from './textPolish.js';

const DOSSIER_KEYWORDS = [
  'dossier',
  'paiement',
  'payment',
  'signature',
  'signer',
  'document',
  'statut',
  'statuts',
  'progression',
  'echeance',
  'échéance',
  'formalite',
  'formalité',
  'immatriculation',
  'kbis',
  'greffe',
  'mandat',
  'procuration',
  'depot',
  'dépôt',
  'capital',
  'refuse',
  'refusé',
  'manque',
  'manquant',
  'etape',
  'étape',
  'avancement',
  'prochaine action',
  'que faire',
  'ou en suis',
  'où en suis',
];

const MAX_KNOWLEDGE_SNIPPETS = 4;
const MAX_SNIPPET_LENGTH = 320;

const parseQuestionnaireJson = (dataJson) => {
  if (!dataJson) return {};
  try {
    return JSON.parse(dataJson);
  } catch (_error) {
    return {};
  }
};

export const isDossierSpecificQuestion = (message = '') => {
  const normalized = String(message || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return DOSSIER_KEYWORDS.some((keyword) => {
    const key = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized.includes(key);
  });
};

const sanitizeDossierContext = (dossier = {}, actionState = null) => ({
  dossierId: dossier.id || null,
  reference: dossier.reference || dossier.id || null,
  companyName: dossier.companyName || dossier.denomination || null,
  legalForm: dossier.legalForm || dossier.formeJuridique || null,
  status: dossier.status || null,
  progressPercent: dossier.progressPercent ?? null,
  actionState: actionState ? {
    kind: actionState.kind,
    label: actionState.label,
    description: actionState.description,
    url: actionState.url,
    priority: actionState.priority,
    blocking: actionState.blocking,
    pendingDocumentCount: actionState.pendingDocumentCount,
    pendingSignatureCount: actionState.pendingSignatureCount,
  } : null,
});

const truncateSnippet = (text, max = MAX_SNIPPET_LENGTH) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
};

const buildKnowledgeContext = (matches = []) => matches.slice(0, MAX_KNOWLEDGE_SNIPPETS).map((match) => ({
  id: match.id,
  intent: match.intent,
  question: truncateSnippet(match.question, 180),
  canonicalAnswer: truncateSnippet(match.canonicalAnswer),
  recommendedAction: truncateSnippet(match.recommendedAction, 160),
  score: match.score,
}));

const buildAllowedActions = (actionState, knowledgeMatches = []) => {
  const actions = [];
  const seenLabels = new Set();

  const pushAction = (action) => {
    const label = String(action?.label || '').trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seenLabels.has(key)) return;
    seenLabels.add(key);
    actions.push(action);
  };

  if (actionState?.label && actionState?.url) {
    pushAction({
      type: 'dossier_action',
      label: polishFrenchClientText(actionState.label),
      url: actionState.url,
      priority: actionState.priority || 'medium',
    });
  }

  for (const match of knowledgeMatches.slice(0, 3)) {
    const label = resolveClientFacingActionLabel(match.recommendedAction, actionState);
    if (!label || isInternalRecommendedAction(label)) continue;
    pushAction({
      type: 'knowledge_action',
      label,
      intent: match.intent,
      sourceId: match.id,
    });
  }

  return actions.slice(0, 3);
};

/**
 * @param {{
 *   userMessage: string,
 *   route?: string | null,
 *   userId?: string | null,
 *   dossierId?: string | null,
 * }} input
 */
export const buildAssistantContext = async ({
  userMessage,
  route = null,
  userId = null,
  dossierId = null,
} = {}) => {
  const cleanMessage = String(userMessage || '').trim();
  const dossierSpecific = isDossierSpecificQuestion(cleanMessage);
  const knowledgeMatches = searchKnowledgeEntries(cleanMessage, {
    limit: 5,
    minScore: 2,
    visibility: 'CLIENT',
  });

  let dossierContext = null;
  let dossierAccessError = null;
  let requiresDossierSelection = false;

  if (dossierSpecific && userId) {
    if (!dossierId) {
      requiresDossierSelection = true;
    } else {
      const dossier = await getDossier(dossierId);
      if (!dossier || dossier.userId !== userId) {
        dossierAccessError = 'DOSSIER_FORBIDDEN';
      } else {
        const questionnaire = parseQuestionnaireJson(dossier.dataJson);
        const documents = await listDossierDocuments(dossier.id);
        const visibleDocuments = filterClientVisibleDocuments(documents);
        const actionState = resolveDossierActionState({
          dossier,
          documents: visibleDocuments,
          questionnaire,
        });
        dossierContext = sanitizeDossierContext(dossier, actionState);
      }
    }
  } else if (dossierId && userId) {
    const dossier = await getDossier(dossierId);
    if (dossier?.userId === userId) {
      const questionnaire = parseQuestionnaireJson(dossier.dataJson);
      const documents = await listDossierDocuments(dossier.id);
      const visibleDocuments = filterClientVisibleDocuments(documents);
      const actionState = resolveDossierActionState({
        dossier,
        documents: visibleDocuments,
        questionnaire,
      });
      dossierContext = sanitizeDossierContext(dossier, actionState);
    }
  }

  const allowedActions = buildAllowedActions(dossierContext?.actionState, knowledgeMatches);

  return {
    userMessage: cleanMessage,
    route: route ? String(route).slice(0, 200) : null,
    dossierContext,
    dossierSpecific,
    requiresDossierSelection,
    dossierAccessError,
    knowledgeMatches: buildKnowledgeContext(knowledgeMatches),
    rawKnowledgeMatches: knowledgeMatches,
    policy: ASSISTANT_POLICY,
    allowedActions,
    selectDossierPrompt: requiresDossierSelection ? SELECT_DOSSIER_PROMPT : null,
    knowledgeSnippets: knowledgeMatches.map((match) => (
      `[${match.id}] ${truncateSnippet(match.canonicalAnswer)}`
    )),
  };
};

export const buildKnowledgeOnlyAnswer = (knowledgeMatches = []) => {
  const top = knowledgeMatches[0];
  if (!top?.canonicalAnswer) return null;
  return top.canonicalAnswer;
};
