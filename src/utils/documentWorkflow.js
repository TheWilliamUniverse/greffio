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
