import { isSignwellConfigured } from './signwell.service.js';
import { isYousignConfigured } from './yousign.service.js';

export const GREFFIO_INTERNAL_PROVIDER = 'greffio_internal';
export const SIGNWELL_PROVIDER = 'signwell';
export const YOUSIGN_PROVIDER = 'yousign';

/**
 * Provider de signature documentaire Greffio.
 * Par défaut : signature interne (consentement + estampillage pdf-lib).
 * Prestataires tiers : signwell | yousign (un seul actif via GREFFIO_SIGNATURE_PROVIDER).
 */
export const resolveSignatureProvider = () => {
  const explicit = String(process.env.GREFFIO_SIGNATURE_PROVIDER || GREFFIO_INTERNAL_PROVIDER).trim().toLowerCase();
  if (explicit === 'signwell' && isSignwellConfigured()) {
    return SIGNWELL_PROVIDER;
  }
  if (explicit === 'yousign' && isYousignConfigured()) {
    return YOUSIGN_PROVIDER;
  }
  return GREFFIO_INTERNAL_PROVIDER;
};

export const shouldUseTrustedProviderForSignature = () => {
  const provider = resolveSignatureProvider();
  return provider === SIGNWELL_PROVIDER || provider === YOUSIGN_PROVIDER;
};

/** @deprecated Préférer shouldUseTrustedProviderForSignature */
export const shouldUseSignwellForSignature = () => resolveSignatureProvider() === SIGNWELL_PROVIDER;

export const isGreffioInternalSignature = () => resolveSignatureProvider() === GREFFIO_INTERNAL_PROVIDER;

/** Mention légale affichée dans les panneaux de signature. */
export const getSignatureLegalNotice = () => (
  'Signature électronique simple (SES) enregistrée par Greffio avec horodatage, identité du signataire et empreinte documentaire.'
);

/** Ligne de preuve estampillée sur le PDF signé. */
export const getSignatureProofLine = () => 'Greffio – signature électronique simple (SES)';
