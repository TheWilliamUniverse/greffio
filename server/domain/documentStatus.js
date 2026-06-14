/** Statuts canoniques stockés côté serveur. */
export const DOCUMENT_STATUSES = Object.freeze({
  REQUESTED: 'requested',
  UPLOADED: 'uploaded',
  UNDER_REVIEW: 'under_review',
  VALID: 'valid',
  INVALID: 'invalid',
});

const COMPLETE_ALIASES = new Set(['valid', 'validated', 'signed']);
const INVALID_ALIASES = new Set(['invalid', 'rejected']);
const REVIEW_ALIASES = new Set(['under_review', 'pending_review', 'generated', 'uploaded']);
const REQUESTED_ALIASES = new Set(['requested', 'attente_docs', 'brouillon', 'urgent', 'a_signer']);

export const normalizeDocumentStatus = (status = '') => {
  const normalized = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (COMPLETE_ALIASES.has(normalized)) return DOCUMENT_STATUSES.VALID;
  if (INVALID_ALIASES.has(normalized)) return DOCUMENT_STATUSES.INVALID;
  if (REVIEW_ALIASES.has(normalized)) return DOCUMENT_STATUSES.UNDER_REVIEW;
  if (REQUESTED_ALIASES.has(normalized)) return DOCUMENT_STATUSES.REQUESTED;
  if (Object.values(DOCUMENT_STATUSES).includes(normalized)) return normalized;
  return DOCUMENT_STATUSES.REQUESTED;
};

export const isDocumentCompleteStatus = (status = '') => (
  COMPLETE_ALIASES.has(String(status || '').trim().toLowerCase())
  || normalizeDocumentStatus(status) === DOCUMENT_STATUSES.VALID
);

export const isDocumentActionableInvalidStatus = (status = '') => (
  INVALID_ALIASES.has(String(status || '').trim().toLowerCase())
  || normalizeDocumentStatus(status) === DOCUMENT_STATUSES.INVALID
);

export const mapClientDocumentStatus = (status = '', hasFile = false) => {
  const canonical = normalizeDocumentStatus(status);
  if (canonical === DOCUMENT_STATUSES.REQUESTED && hasFile) return 'PENDING_REVIEW';
  if (canonical === DOCUMENT_STATUSES.VALID) return 'VALIDATED';
  if (canonical === DOCUMENT_STATUSES.INVALID) return 'REJECTED';
  if (canonical === DOCUMENT_STATUSES.UNDER_REVIEW) return 'PENDING_REVIEW';
  if (canonical === DOCUMENT_STATUSES.UPLOADED) return 'UPLOADED';
  return String(status || 'REQUESTED').toUpperCase();
};
