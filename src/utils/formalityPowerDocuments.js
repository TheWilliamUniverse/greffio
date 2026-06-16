/** Document unique procuration + pouvoirs pour formalités (clé canonique). */
export const MERGED_FORMALITY_POWER_DOC_KEY = 'formality_powers';

/** Ancienne clé procuration Greffio – masquée côté client, fusionnée conceptuellement. */
export const LEGACY_PROXY_MANDATE_DOC_KEY = 'proxy_mandate';

const POWER_DOC_KEYS = new Set([
  MERGED_FORMALITY_POWER_DOC_KEY,
  LEGACY_PROXY_MANDATE_DOC_KEY,
  'power_of_attorney',
  'mandate',
]);
const POWER_KEYWORDS = ['pouvoir', 'procuration', 'mandat'];

export const isLegacyProxyMandateDocument = (document = {}) => (
  String(document.docKey || '').toLowerCase() === LEGACY_PROXY_MANDATE_DOC_KEY
);

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

/** Retourne le document fusionné procuration/pouvoirs (formality_powers prioritaire). */
export const resolveMergedFormalityPowerDocument = (documents = []) => {
  const list = Array.isArray(documents) ? documents : [];
  const primary = list.find((doc) => doc.docKey === MERGED_FORMALITY_POWER_DOC_KEY);
  if (primary) return primary;
  const legacy = list.find((doc) => doc.docKey === LEGACY_PROXY_MANDATE_DOC_KEY);
  if (legacy) {
    return {
      ...legacy,
      label: MERGED_FORMALITY_POWER_LABEL,
      name: MERGED_FORMALITY_POWER_LABEL,
      mergedFromLegacy: true,
    };
  }
  return null;
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

export const MERGED_FORMALITY_POWER_LABEL = 'Procuration et pouvoirs pour formalités';

export const MERGED_FORMALITY_POWER_INFO = 'Autorise WILLIAM ESTABLISHMENTS à déposer et suivre vos formalités administratives. Les annonces légales restent exclues.';
