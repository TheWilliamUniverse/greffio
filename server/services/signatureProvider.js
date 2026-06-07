/**
 * Abstraction signature Greffio.
 * - simple_consent : enregistrement interne (canvas / consentement)
 * - trusted_signature_provider : SignWell ou Signaturit
 */

export const SIGNATURE_MODES = {
  SIMPLE_CONSENT: 'simple_consent',
  TRUSTED_PROVIDER: 'trusted_signature_provider',
};

export const resolveSignatureMode = ({ docKey, legalForm } = {}) => {
  const provider = String(process.env.SIGNATURE_PROVIDER || 'internal').toLowerCase();
  if (provider === 'signwell' && process.env.SIGNWELL_API_KEY) {
    return SIGNATURE_MODES.TRUSTED_PROVIDER;
  }
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
