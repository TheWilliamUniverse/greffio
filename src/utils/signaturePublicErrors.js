/** Messages d’erreur signature publique – français juridique simple. */
export const mapSignaturePublicError = (code, fallback = '') => {
  const key = String(code || '').toUpperCase();
  const messages = {
    SIGNATURE_TOKEN_NOT_FOUND: 'Ce lien de signature est invalide, expiré ou déjà utilisé. Veuillez demander un nouveau lien à Greffio.',
    SIGNATURE_TOKEN_INVALID: 'Ce lien de signature est invalide, expiré ou déjà utilisé. Veuillez demander un nouveau lien à Greffio.',
    SIGNATURE_TOKEN_EXPIRED: 'Ce lien de signature est invalide, expiré ou déjà utilisé. Veuillez demander un nouveau lien à Greffio.',
    SIGNATURE_TOKEN_ALREADY_USED: 'Ce lien a déjà été utilisé. Le document est signé ou le lien n’est plus valable.',
    ALREADY_SIGNED: 'Ce document a déjà été signé.',
    SIGNATURE_CONSENT_REQUIRED: 'Vous devez cocher la case de consentement avant de signer.',
    SIGNER_EMAIL_REQUIRED: 'Indiquez l’email du signataire pour poursuivre.',
    SIGNER_NAME_REQUIRED: 'Indiquez votre nom complet tel qu’il figure sur le document.',
    SIGNATURE_PREVIEW_REQUIRED: 'Consultez le document avant de le signer.',
    SIGNATURE_PDF_NOT_FOUND: 'Le document n’est plus disponible. Contactez l’équipe Greffio.',
    PUBLIC_SIGN_FAILED: 'La signature n’a pas pu être enregistrée. Réessayez ou demandez un nouveau lien.',
    INVALID_SIGNATURE_FORMAT: 'Le format de la signature est invalide. Générez ou dessinez une nouvelle signature.',
    SIGNATURE_OTP_REQUIRED: 'Validez le code reçu par email avant de finaliser la signature.',
    SIGNATURE_OTP_INVALID: 'Le code saisi est incorrect ou expiré.',
    SIGNATURE_OTP_EXPIRED: 'Le code saisi est incorrect ou expiré.',
    SIGNATURE_OTP_TOO_MANY_ATTEMPTS: 'Trop de tentatives. Demandez un nouveau code ou contactez Greffio.',
  };
  return messages[key] || fallback || 'Signature impossible pour le moment. Réessayez ou contactez l’équipe Greffio.';
};
