/**
 * Abstraction signature Greffio — signature interne (consentement + estampillage).
 */

export const SIGNATURE_MODES = {
  SIMPLE_CONSENT: 'simple_consent',
};

export const resolveSignatureMode = () => SIGNATURE_MODES.SIMPLE_CONSENT;

export const signatureDisclaimer = () => (
  'Signature électronique simple (SES) enregistrée par Greffio avec horodatage, identité du signataire et empreinte documentaire.'
);
