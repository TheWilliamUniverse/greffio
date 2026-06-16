import { isClientDocumentComplete, normalizeDocumentStatusKey } from '@/utils/documentStatusNormalize.js';

/** Pièces retirées de la checklist client (doublon ou fusion dans un autre doc). */
export const REDUNDANT_CLIENT_DOC_KEYS = Object.freeze([
  'filiation_declaration',
  'proxy_mandate',
]);

export const filterClientVisibleDocuments = (documents = []) => (
  documents.filter((doc) => !REDUNDANT_CLIENT_DOC_KEYS.includes(doc.docKey))
);

export const documentHasFile = (doc = {}) => Boolean(
  doc.filename || doc.storageUrl || doc.fileUrl || doc.hasFile,
);

/** Statut affiché côté client (évite « À fournir » quand une pièce est déjà déposée). */
export const resolveClientDocumentStatus = (doc = {}) => {
  const status = String(doc.status || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (status === 'REQUESTED' && documentHasFile(doc)) return 'PENDING_REVIEW';
  return status;
};

export const getClientDocumentReviewHint = (doc = {}) => {
  const metadata = typeof doc.metadata === 'object' && doc.metadata !== null
    ? doc.metadata
    : null;
  if (metadata?.analysis?.requiresManualReview) {
    return 'Contrôle Greffio en cours';
  }
  return null;
};

/** Statuts document nécessitant une action client. */
export const ACTIONABLE_DOCUMENT_STATUSES = Object.freeze([
  'REQUESTED',
  'UPLOADED',
  'PENDING_REVIEW',
  'INVALID',
  'REJECTED',
  'GENERATED',
]);

export const countActionableDocuments = (documents = []) => (
  documents.filter((document) => {
    const hasFile = documentHasFile(document);
    const status = resolveClientDocumentStatus({ ...document, hasFile });
    const bucket = normalizeDocumentStatusKey(status);
    return bucket === 'REQUESTED' || bucket === 'REJECTED';
  }).length
);

/** Document nécessitant encore une action client (dépôt, correction, signature). */
export const isClientDocumentActionRequired = (doc = {}) => {
  if (isClientDocumentComplete(doc.status)) return false;
  const hasFile = documentHasFile(doc);
  const status = resolveClientDocumentStatus({ ...doc, hasFile });
  const bucket = normalizeDocumentStatusKey(status);
  if (bucket === 'VALIDATED' || bucket === 'PENDING_REVIEW') return false;
  return bucket === 'REQUESTED' || bucket === 'REJECTED';
};

export const filterClientActionRequiredDocuments = (documents = []) => (
  documents.filter(isClientDocumentActionRequired)
);

export const getDocumentRejectionReason = (doc = {}) => {
  const reason = String(doc.rejectedReason || '').trim();
  return reason || null;
};

export const formatDocumentRejectionHint = (doc = {}) => {
  const reason = getDocumentRejectionReason(doc);
  if (!reason) return 'Une correction est nécessaire avant dépôt.';
  return `Motif du refus : ${reason}`;
};
