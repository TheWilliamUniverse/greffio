export const GREFFIO_INTERNAL_PROVIDER = 'greffio_internal';

/**
 * Provider de signature documentaire Greffio — signature interne uniquement
 * (consentement + estampillage pdf-lib).
 */
export const resolveSignatureProvider = () => GREFFIO_INTERNAL_PROVIDER;

export const shouldUseTrustedProviderForSignature = () => false;

/** @deprecated Toujours false — prestataires tiers retirés. */
export const shouldUseSignwellForSignature = () => false;

export const isGreffioInternalSignature = () => true;

/** Mention légale affichée dans les panneaux de signature. */
export const getSignatureLegalNotice = () => (
  'Signature électronique simple (SES) enregistrée par Greffio avec horodatage, identité du signataire et empreinte documentaire.'
);

/** Ligne de preuve estampillée sur le PDF signé. */
export const getSignatureProofLine = () => 'Greffio – signature électronique simple (SES)';
