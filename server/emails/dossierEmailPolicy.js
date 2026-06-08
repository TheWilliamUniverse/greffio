import { query } from '../dbClient.js';

const THROTTLE_HOURS = Object.freeze({
  welcome: 24,
  account_welcome: 24,
  contact_confirmed: 24,
  dossier_created: 12,
  dossier_resume_reminder: 12,
  documents_received: 6,
  statutes_generated: 12,
  editable_document_signature_request: 1,
  non_conviction_signature_request: 1,
  ops_message: 4,
  default: 8,
});

const ALWAYS_SEND = new Set([
  'password_reset',
  'authentication_code',
  'password_changed',
  'suspicious_login_attempt',
  'login_notification',
]);

export const hasRecentSuccessfulEmail = async ({
  templateId,
  dossierId = null,
  recipientEmail,
  withinHours = null,
}) => {
  const hours = withinHours ?? THROTTLE_HOURS[templateId] ?? THROTTLE_HOURS.default;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const email = String(recipientEmail || '').trim().toLowerCase();
  if (!email || !templateId) return false;

  const result = await query(`
    SELECT id
    FROM email_events
    WHERE template_id = $1
      AND lower(recipient_email) = $2
      AND status = 'sent'
      AND created_at >= $3
      AND ($4::text IS NULL OR dossier_id = $4)
    LIMIT 1
  `, [templateId, email, since, dossierId || null]);

  return Boolean(result.rows[0]);
};

export const shouldSendDossierEmail = async ({
  templateId,
  dossierId = null,
  recipientEmail,
  force = false,
}) => {
  if (force || ALWAYS_SEND.has(templateId)) {
    return { ok: true };
  }
  const duplicate = await hasRecentSuccessfulEmail({ templateId, dossierId, recipientEmail });
  if (duplicate) {
    return { ok: false, reason: 'EMAIL_RECENTLY_SENT', templateId };
  }
  return { ok: true };
};
