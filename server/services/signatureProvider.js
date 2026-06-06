/**
 * Abstraction signature Greffio.
 * - simple_consent : enregistrement interne (canvas / consentement)
 * - trusted_signature_provider : Signaturit (à brancher) — pas de Yousign
 */

export const SIGNATURE_MODES = {
  SIMPLE_CONSENT: 'simple_consent',
  TRUSTED_PROVIDER: 'trusted_signature_provider',
};

export const resolveSignatureMode = ({ docKey, legalForm } = {}) => {
  const provider = String(process.env.SIGNATURE_PROVIDER || 'internal').toLowerCase();
  if (provider === 'signaturit' && process.env.SIGNATURIT_ACCESS_TOKEN) {
    return SIGNATURE_MODES.TRUSTED_PROVIDER;
  }
  if (['statutes_final', 'mandate_deposit'].includes(String(docKey || ''))) {
    return SIGNATURE_MODES.TRUSTED_PROVIDER;
  }
  return SIGNATURE_MODES.SIMPLE_CONSENT;
};

export const signatureDisclaimer = () => (
  'Cette signature atteste votre accord dans Greffio. Certaines formalités peuvent exiger une signature avancée ou qualifiée via un prestataire tiers.'
);
