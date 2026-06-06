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
  documents.filter((document) => ACTIONABLE_DOCUMENT_STATUSES.includes(
    String(document.status || '').toUpperCase(),
  )).length
);
