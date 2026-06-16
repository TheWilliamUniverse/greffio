/**
 * Feature flags pour réduire le volume d'emails transactionnels.
 * Désactiver via .env ; les valeurs par défaut reflètent l'audit OPS 2026-06-13.
 */

const truthy = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  return defaultValue;
};

export const emailFeatureFlags = Object.freeze({
  /** Alertes de connexion : opt-in uniquement (défaut OFF). */
  loginAlerts: truthy(process.env.EMAIL_LOGIN_ALERTS_ENABLED, false),
  /** Email « contact confirmé » en doublon du welcome à l'étape contact questionnaire. */
  dossierContactConfirmed: truthy(process.env.EMAIL_DOSSIER_CONTACT_CONFIRMED_ENABLED, false),
  /** Accusé réception à chaque upload de document. */
  documentUploadReceived: truthy(process.env.EMAIL_DOCUMENT_UPLOAD_RECEIVED_ENABLED, true),
  /** Relances dossier incomplet (cron send-dossier-reminders.js, J+7 et J+14). */
  dossierReminders: truthy(process.env.EMAIL_DOSSIER_REMINDERS_ENABLED, true),
  /** Notification interne OPS à chaque commande ressource. */
  resourceOrderInternal: truthy(process.env.EMAIL_RESOURCE_ORDER_INTERNAL_ENABLED, false),
  /** Email dossier créé (étape validation questionnaire complète). */
  dossierCreated: truthy(process.env.EMAIL_DOSSIER_CREATED_ENABLED, true),
  /** Notification statuts générés. */
  statutesGenerated: truthy(process.env.EMAIL_STATUTES_GENERATED_ENABLED, true),
  /** payment_confirmed / payment_failed / invoice_available : flux facture Qonto+Mollie uniquement. */
  invoicePaymentEmails: truthy(process.env.EMAIL_INVOICE_PAYMENT_ENABLED, true),
  /** Digest hebdomadaire dossiers. */
  weeklyDigest: truthy(process.env.EMAIL_WEEKLY_DIGEST_ENABLED, false),
  /** Enquête satisfaction (fin de formalité ou tous les 9 jours). */
  satisfactionRequest: truthy(process.env.EMAIL_SATISFACTION_REQUEST_ENABLED, true),
  /** Emails OPS métier (nouveau dossier, alerte risque, erreur système). */
  opsEmails: truthy(process.env.EMAIL_OPS_NOTIFICATIONS_ENABLED, true),
  /** Signatures (NC, pouvoirs, souscripteurs, Signwell) : toujours actives si non listées ici. */
  signatureEmails: truthy(process.env.EMAIL_SIGNATURE_REQUESTS_ENABLED, true),
});

/** Map templateId → clé de flag (null = pas de gate env). */
export const EMAIL_TEMPLATE_FLAG_MAP = Object.freeze({
  login_notification: 'loginAlerts',
  contact_confirmed: 'dossierContactConfirmed',
  documents_received: 'documentUploadReceived',
  dossier_resume_reminder: 'dossierReminders',
  dossier_incomplete: 'dossierReminders',
  inactive_reminder: 'dossierReminders',
  resource_order_internal: 'resourceOrderInternal',
  dossier_created: 'dossierCreated',
  statutes_generated: 'statutesGenerated',
  payment_confirmed: 'invoicePaymentEmails',
  payment_failed: 'invoicePaymentEmails',
  invoice_available: 'invoicePaymentEmails',
  weekly_digest: 'weeklyDigest',
  satisfaction_request: 'satisfactionRequest',
  ops_new_dossier: 'opsEmails',
  ops_risk_alert: 'opsEmails',
  ops_system_error: 'opsEmails',
  ops_message: 'opsEmails',
  ops_invoice_pending_review: 'opsEmails',
  editable_document_signature_request: 'signatureEmails',
  non_conviction_signature_request: 'signatureEmails',
  subscribers_list_signature_request: 'signatureEmails',
  formality_powers_signature_request: 'signatureEmails',
});

export const isEmailFeatureEnabled = (key) => Boolean(emailFeatureFlags[key]);

export const isEmailTemplateEnabled = (templateId) => {
  const flagKey = EMAIL_TEMPLATE_FLAG_MAP[String(templateId || '')];
  if (!flagKey) return true;
  return isEmailFeatureEnabled(flagKey);
};
