/**
 * Feature flags pour réduire le volume d'emails transactionnels.
 * Tous activés par défaut — désactiver via .env uniquement si validé OPS.
 */

const truthy = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  return defaultValue;
};

export const emailFeatureFlags = Object.freeze({
  /** Alertes de connexion réussie (respecte aussi loginAlertsEnabled côté profil). */
  loginAlerts: truthy(process.env.EMAIL_LOGIN_ALERTS_ENABLED, true),
  /** Email « contact confirmé » en doublon du welcome à l'étape contact questionnaire. */
  dossierContactConfirmed: truthy(process.env.EMAIL_DOSSIER_CONTACT_CONFIRMED_ENABLED, true),
  /** Accusé réception à chaque upload de document. */
  documentUploadReceived: truthy(process.env.EMAIL_DOCUMENT_UPLOAD_RECEIVED_ENABLED, true),
  /** Relances dossier incomplet (cron send-dossier-reminders.js). */
  dossierReminders: truthy(process.env.EMAIL_DOSSIER_REMINDERS_ENABLED, true),
  /** Notification interne OPS à chaque commande ressource. */
  resourceOrderInternal: truthy(process.env.EMAIL_RESOURCE_ORDER_INTERNAL_ENABLED, true),
});

export const isEmailFeatureEnabled = (key) => Boolean(emailFeatureFlags[key]);
