const POWER_DOC_KEYS = new Set(['formality_powers', 'proxy_mandate', 'power_of_attorney', 'mandate']);
const POWER_KEYWORDS = ['pouvoir', 'procuration', 'mandat'];

export const isFormalityPowerDocument = (document = {}) => {
  const docKey = String(document.docKey || '').toLowerCase();
  if (POWER_DOC_KEYS.has(docKey)) {
    return { match: true, confidence: 'high', docKey };
  }
  const haystack = [
    document.label,
    document.name,
    document.type,
    document.title,
  ].filter(Boolean).join(' ').toLowerCase();
  if (POWER_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return { match: true, confidence: 'medium', docKey };
  }
  return { match: false, confidence: 'low', docKey };
};

export const mapFormalityPowerStatus = (document = {}) => {
  const status = String(document.status || '').trim().toUpperCase().replace(/\s+/g, '_');
  const hasFile = Boolean(document.hasFile);

  if (!hasFile && (!status || status === 'REQUESTED')) return 'missing';
  if (status === 'GENERATED') return 'pending_signature';
  if (status === 'PENDING_REVIEW') return 'requires_manual_review';
  if (status === 'SIGNED') return 'signed_unverified';
  if (['VALID', 'VALIDATED', 'VERIFIED'].includes(status)) return 'verified';
  if (['REJECTED', 'INVALID'].includes(status)) return 'rejected';
  if (hasFile) return 'signed_unverified';
  return 'requires_manual_review';
};

export const FORMALITY_POWER_STATUS_LABELS = {
  missing: 'À fournir',
  pending_signature: 'Signature attendue',
  signed: 'Signé',
  signed_unverified: 'Signé – à vérifier',
  verified: 'Vérifié',
  rejected: 'Refusé',
  requires_manual_review: 'Vérification manuelle',
};
