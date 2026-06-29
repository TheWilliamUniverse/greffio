export const GREFFIO_INTERNAL_PROVIDER = 'greffio_internal';

/**
 * Provider de signature documentaire Greffio — signature interne par défaut.
 * Signwell reste désactivé en prod sauf opt-in explicite (SIGNWELL_ENABLED=true).
 */
export const resolveSignatureProvider = () => GREFFIO_INTERNAL_PROVIDER;

export const shouldUseTrustedProviderForSignature = () => false;

export const isSignwellConfigured = () => (
  String(process.env.SIGNWELL_ENABLED || '').trim().toLowerCase() === 'true'
  && Boolean(String(process.env.SIGNWELL_API_KEY || '').trim())
);

/** Signwell uniquement si activé explicitement — défaut false en production. */
export const shouldUseSignwellForSignature = () => isSignwellConfigured();

export const isGreffioInternalSignature = () => !shouldUseSignwellForSignature();

/** Mention légale affichée dans les panneaux de signature. */
export const getSignatureLegalNotice = () => (
  'Signature électronique simple (SES) enregistrée par Greffio avec horodatage, identité du signataire et empreinte documentaire.'
);

/** Ligne de preuve estampillée sur le PDF signé. */
export const getSignatureProofLine = () => 'Greffio – signature électronique simple (SES)';
