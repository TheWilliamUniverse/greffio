import { isSignwellConfigured } from './signwell.service.js';

export const GREFFIO_INTERNAL_PROVIDER = 'greffio_internal';

/**
 * Provider de signature documentaire Greffio.
 * Par défaut : signature interne (consentement + estampillage pdf-lib).
 * SignWell dormant sauf SIGNWELL_ENABLED=true + GREFFIO_SIGNATURE_PROVIDER=signwell + clé API.
 */
export const resolveSignatureProvider = () => {
  const explicit = String(process.env.GREFFIO_SIGNATURE_PROVIDER || GREFFIO_INTERNAL_PROVIDER).trim().toLowerCase();
  if (explicit === 'signwell' && isSignwellConfigured()) {
    return 'signwell';
  }
  return GREFFIO_INTERNAL_PROVIDER;
};

export const shouldUseSignwellForSignature = () => resolveSignatureProvider() === 'signwell';

export const isGreffioInternalSignature = () => resolveSignatureProvider() === GREFFIO_INTERNAL_PROVIDER;

/** Mention légale affichée dans les panneaux de signature. */
export const getSignatureLegalNotice = () => (
  'Signature électronique simple (SES) enregistrée par Greffio avec horodatage, identité du signataire et empreinte documentaire.'
);

/** Ligne de preuve estampillée sur le PDF signé. */
export const getSignatureProofLine = () => 'Greffio – signature électronique simple (SES)';
