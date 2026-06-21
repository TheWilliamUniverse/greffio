const CONFIGURATION_ERRORS = new Set([
  'GOCARDLESS_FORBIDDEN_FOR_B2C',
  'B2C_REQUIRES_MOLLIE',
  'MOLLIE_NOT_CONFIGURED',
  'CAWL_DISABLED',
  'PAYMENT_PROVIDER_NOT_CONFIGURED',
  'CAWL_NOT_CONFIGURED',
  'CAWL_WORLDLINE_NOT_CONFIGURED',
  'PROVIDER_NOT_AVAILABLE',
]);

const TRANSIENT_ERRORS = new Set([
  'API_TRANSIENT_UNAVAILABLE',
  'CAWL_SERVER_UNAVAILABLE',
  'PROVIDER_CREATE_FAILED',
]);

/**
 * Message utilisateur pour les erreurs de checkout paiement (Mollie).
 * @param {Error & { payload?: { error?: string }, status?: number }} error
 */
export const resolvePaymentCheckoutErrorMessage = (error) => {
  const code = error?.payload?.error || error?.code || error?.message;

  if (CONFIGURATION_ERRORS.has(code)) {
    return 'Paiement carte indisponible : le prestataire serveur n’est pas encore configuré.';
  }
  if (TRANSIENT_ERRORS.has(code) || error?.status === 503 || error?.status === 502) {
    return 'Paiement momentanément indisponible. Réessayez dans quelques instants.';
  }
  if (code === 'ORDER_NOT_PAYABLE') {
    return 'Cette commande n’est plus payable. Contactez le support Greffio si besoin.';
  }
  if (code === 'ORDER_FORBIDDEN' || code === 'DOSSIER_FORBIDDEN' || code === 'PAYMENT_FORBIDDEN') {
    return 'Accès refusé à ce paiement.';
  }
  if (code === 'ORDER_NOT_FOUND' || code === 'DOSSIER_NOT_FOUND') {
    return 'Commande ou dossier introuvable.';
  }
  if (code === 'AUTH_TOKEN_MISSING' || code === 'AUTH_SESSION_EXPIRED') {
    return 'Session expirée. Reconnectez-vous pour payer.';
  }
  if (code === 'CONTACT_EMAIL_REQUIRED') {
    return 'Votre compte doit avoir une adresse e-mail valide pour commander.';
  }
  if (code === 'CART_EMPTY' || code === 'SERVICE_NOT_FOUND') {
    return 'Panier invalide. Rechargez la page boutique et réessayez.';
  }
  if (code === 'CHECKOUT_URL_MISSING') {
    return 'Le lien de paiement sécurisé n’a pas pu être généré.';
  }
  return 'Impossible d’initialiser le paiement sécurisé.';
};
