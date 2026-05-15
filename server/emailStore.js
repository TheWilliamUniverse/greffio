import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

const addEmailEvent = async ({
  dossierId = null,
  userId = null,
  templateId,
  recipientEmail,
  subject,
  status,
  providerMessageId = null,
  payload = {},
  errorMessage = null,
  sentAt = null,
}) => {
  const event = {
    id: randomUUID(),
    dossierId,
    userId,
    templateId,
    recipientEmail,
    subject,
    status,
    providerMessageId,
    payloadJson: JSON.stringify(payload || {}),
    errorMessage,
    createdAt: nowIso(),
    sentAt,
  };
  if (hasPostgres) {
    await query(`
      INSERT INTO email_events (
        id, dossier_id, user_id, template_id, recipient_email, subject, status, provider_message_id, payload_json, error_message, created_at, sent_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [
      event.id,
      event.dossierId,
      event.userId,
      event.templateId,
      event.recipientEmail,
      event.subject,
      event.status,
      event.providerMessageId,
      event.payloadJson,
      event.errorMessage,
      event.createdAt,
      event.sentAt,
    ]);
    return event;
  }
  sqlite.prepare(`
    INSERT INTO email_events (
      id, dossier_id, user_id, template_id, recipient_email, subject, status, provider_message_id, payload_json, error_message, created_at, sent_at
    ) VALUES (
      @id, @dossierId, @userId, @templateId, @recipientEmail, @subject, @status, @providerMessageId, @payloadJson, @errorMessage, @createdAt, @sentAt
    )
  `).run(event);
  return event;
};

export {
  addEmailEvent,
};
