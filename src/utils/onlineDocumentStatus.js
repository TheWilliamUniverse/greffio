import { getDocumentStatusLabel } from '@/utils/documentStatusLabels.js';
import { documentHasFile, resolveClientDocumentStatus } from '@/utils/documentWorkflow.js';

export const ONLINE_DOCUMENT_KEYS = Object.freeze({
  non_conviction: 'manager_non_conviction',
  subscribers: 'subscribers_list',
  powers: 'formality_powers',
});

export const resolveOnlineDocumentState = (docKey, documents = [], fallbackHint = '') => {
  const apiKey = ONLINE_DOCUMENT_KEYS[docKey] || docKey;
  const doc = documents.find((item) => item.docKey === apiKey);
  if (!doc) {
    return {
      docKey: apiKey,
      status: 'REQUESTED',
      statusLabel: getDocumentStatusLabel('REQUESTED'),
      hint: fallbackHint,
      isComplete: false,
    };
  }
  const hasFile = documentHasFile(doc);
  const status = resolveClientDocumentStatus({ ...doc, hasFile });
  const normalized = String(status || '').toUpperCase();
  const isComplete = ['VALID', 'VALIDATED', 'SIGNED'].includes(normalized);
  const isPending = ['UPLOADED', 'PENDING_REVIEW', 'UNDER_REVIEW', 'GENERATED'].includes(normalized);
  let hint = fallbackHint;
  if (isComplete) hint = 'Validé — document enregistré';
  else if (isPending) hint = 'Envoyé — en cours de vérification';
  else if (['INVALID', 'REJECTED'].includes(normalized)) hint = 'À corriger puis renvoyer';
  else if (hasFile) hint = 'Déposé — compléter ou signer si besoin';

  return {
    docKey: apiKey,
    status,
    statusLabel: getDocumentStatusLabel(status),
    hint,
    isComplete,
    hasFile,
  };
};
