export const normalizeDocumentStatusKey = (status = '') => {
  const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (['VALID', 'VALIDATED', 'SIGNED'].includes(normalized)) return 'VALIDATED';
  if (['INVALID', 'REJECTED'].includes(normalized)) return 'REJECTED';
  if (['UPLOADED', 'GENERATED', 'UNDER_REVIEW', 'PENDING_REVIEW', 'EN_ANALYSE'].includes(normalized)) return 'PENDING_REVIEW';
  if (['REQUESTED', 'ATTENTE_DOCS', 'BROUILLON', 'URGENT', 'A_SIGNER'].includes(normalized)) return 'REQUESTED';
  return normalized || 'REQUESTED';
};

export const isClientDocumentComplete = (status = '') => (
  ['VALID', 'VALIDATED', 'SIGNED'].includes(String(status || '').trim().toUpperCase())
);
