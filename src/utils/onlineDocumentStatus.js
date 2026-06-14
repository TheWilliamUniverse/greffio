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
    const userAction = resolveDocumentUserAction('REQUESTED', false);
    return {
      docKey: apiKey,
      status: 'REQUESTED',
      statusLabel: getDocumentStatusLabel('REQUESTED'),
      hint: userAction.hint || fallbackHint,
      cta: userAction.cta,
      action: userAction.action,
      isComplete: false,
      hasFile: false,
    };
  }
  const hasFile = documentHasFile(doc);
  const status = resolveClientDocumentStatus({ ...doc, hasFile });
  const normalized = String(status || '').toUpperCase();
  const isComplete = ['VALID', 'VALIDATED', 'SIGNED'].includes(normalized);
  const isPending = ['UPLOADED', 'PENDING_REVIEW', 'UNDER_REVIEW', 'GENERATED'].includes(normalized);
  let hint = fallbackHint;
  if (isComplete) hint = 'Validé – document enregistré';
  else if (isPending) hint = 'Envoyé – en cours de vérification';
  else if (['INVALID', 'REJECTED'].includes(normalized)) {
    const reason = String(doc.rejectedReason || '').trim();
    hint = reason ? `Motif du refus : ${reason}` : 'À corriger puis renvoyer';
  }
  else if (hasFile) hint = 'Déposé – compléter ou signer si besoin';

  const userAction = resolveDocumentUserAction(status, hasFile, doc.rejectedReason);

  return {
    docKey: apiKey,
    status,
    statusLabel: getDocumentStatusLabel(status),
    hint: userAction.hint || hint,
    cta: userAction.cta,
    action: userAction.action,
    isComplete,
    hasFile,
  };
};

/** Traduction statut document → hint actionnable + CTA unique (audit mobile). */
export const resolveDocumentUserAction = (status, hasFile = false, rejectedReason = null) => {
  const normalized = String(status || '').toUpperCase();

  if (['VALID', 'VALIDATED', 'SIGNED'].includes(normalized)) {
    return {
      hint: 'Document enregistré dans votre dossier.',
      cta: 'Télécharger',
      action: 'download',
    };
  }

  if (['UPLOADED', 'PENDING_REVIEW', 'UNDER_REVIEW', 'GENERATED'].includes(normalized)) {
    return {
      hint: 'Envoyé à Greffio. Nous vérifions sa conformité.',
      cta: 'Voir',
      action: 'view',
    };
  }

  if (['INVALID', 'REJECTED'].includes(normalized)) {
    const reason = String(rejectedReason || '').trim();
    return {
      hint: reason ? `Motif du refus : ${reason}` : 'Une correction est nécessaire avant dépôt.',
      cta: 'Corriger',
      action: 'correct',
    };
  }

  if (['A_SIGNER'].includes(normalized)) {
    return {
      hint: 'Ce document attend votre signature.',
      cta: 'Signer',
      action: 'sign',
    };
  }

  if (!hasFile || ['REQUESTED', 'ATTENTE_DOCS', 'BROUILLON', 'URGENT'].includes(normalized)) {
    return {
      hint: 'Ce document doit être complété puis signé.',
      cta: 'Remplir',
      action: 'fill',
    };
  }

  return {
    hint: 'Déposé – compléter ou signer si besoin.',
    cta: 'Voir',
    action: 'view',
  };
};
