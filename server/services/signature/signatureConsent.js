export const SIGNATURE_CONSENT_VERSION = 'greffio-ses-fr-v1.0';

export const getSignatureConsentText = ({ locale = 'fr' } = {}) => {
  if (locale === 'en') {
    return {
      version: SIGNATURE_CONSENT_VERSION,
      text: 'By checking this box, I confirm that I have read the document above and agree to sign it electronically via Greffio. I understand this constitutes a simple electronic signature.',
    };
  }
  return {
    version: SIGNATURE_CONSENT_VERSION,
    text: 'En cochant cette case, je reconnais avoir lu le document présenté ci-dessus et j\'accepte de le signer électroniquement via Greffio. Je comprends que cette signature constitue une signature électronique simple et qu\'elle manifeste mon consentement au contenu du document.',
  };
};

export const getSignatureLegalNotice = () => (
  'Signature électronique simple renforcée (SES) enregistrée par Greffio avec horodatage, identité du signataire et empreinte documentaire.'
);

export const isSignatureOtpRequired = () => {
  const raw = String(process.env.GREFFIO_SIGNATURE_REQUIRE_OTP || '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
};

export const getSignatureTokenTtlHours = () => {
  const hours = Number(process.env.GREFFIO_SIGNATURE_TOKEN_TTL_HOURS || 72);
  return Number.isFinite(hours) && hours > 0 ? hours : 72;
};
