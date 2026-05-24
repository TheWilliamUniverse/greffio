import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

const serializeTags = (tags) => {
  if (!tags) return null;
  if (Array.isArray(tags)) return JSON.stringify(tags);
  return JSON.stringify([String(tags)]);
};

const addEmailEvent = async ({
  dossierId = null,
  userId = null,
  templateId,
  recipientEmail,
  subject,
  status,
  provider = null,
  providerMessageId = null,
  tags = [],
  errorCode = null,
  payload = {},
  errorMessage = null,
  sentAt = null,
  openedAt = null,
  clickedAt = null,
}) => {
  const event = {
    id: randomUUID(),
    dossierId,
    userId,
    templateId,
    recipientEmail,
    subject,
    status,
    provider,
    providerMessageId,
    tagsJson: serializeTags(tags),
    errorCode,
    payloadJson: JSON.stringify(payload || {}),
    errorMessage,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    sentAt,
    openedAt,
    clickedAt,
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO email_events (
        id, dossier_id, user_id, template_id, recipient_email, subject, status,
        provider, provider_message_id, tags_json, error_code, payload_json, error_message,
        created_at, updated_at, sent_at, opened_at, clicked_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    `, [
      event.id,
      event.dossierId,
      event.userId,
      event.templateId,
      event.recipientEmail,
      event.subject,
      event.status,
      event.provider,
      event.providerMessageId,
      event.tagsJson,
      event.errorCode,
      event.payloadJson,
      event.errorMessage,
      event.createdAt,
      event.updatedAt,
      event.sentAt,
      event.openedAt,
      event.clickedAt,
    ]);
    return event;
  }

  sqlite.prepare(`
    INSERT INTO email_events (
      id, dossier_id, user_id, template_id, recipient_email, subject, status,
      provider, provider_message_id, tags_json, error_code, payload_json, error_message,
      created_at, updated_at, sent_at, opened_at, clicked_at
    ) VALUES (
      @id, @dossierId, @userId, @templateId, @recipientEmail, @subject, @status,
      @provider, @providerMessageId, @tagsJson, @errorCode, @payloadJson, @errorMessage,
      @createdAt, @updatedAt, @sentAt, @openedAt, @clickedAt
    )
  `).run(event);
  return event;
};

const updateEmailEventByProviderMessageId = async ({
  providerMessageId,
  status,
  openedAt = null,
  clickedAt = null,
  payloadPatch = {},
}) => {
  if (!providerMessageId) return null;
  const updatedAt = nowIso();

  if (hasPostgres) {
    const existing = await query(`
      SELECT id, payload_json AS "payloadJson", opened_at AS "openedAt", clicked_at AS "clickedAt"
      FROM email_events
      WHERE provider_message_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [providerMessageId]);
    const row = existing.rows[0];
    if (!row) return null;
    const payload = {
      ...(row.payloadJson ? JSON.parse(row.payloadJson) : {}),
      ...payloadPatch,
    };
    await query(`
      UPDATE email_events
      SET status = $1,
          opened_at = COALESCE($2, opened_at),
          clicked_at = COALESCE($3, clicked_at),
          payload_json = $4,
          updated_at = $5
      WHERE id = $6
    `, [
      status,
      openedAt,
      clickedAt,
      JSON.stringify(payload),
      updatedAt,
      row.id,
    ]);
    return row.id;
  }

  const row = sqlite.prepare(`
    SELECT id, payload_json AS payloadJson, opened_at AS openedAt, clicked_at AS clickedAt
    FROM email_events
    WHERE provider_message_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(providerMessageId);
  if (!row) return null;
  const payload = {
    ...(row.payloadJson ? JSON.parse(row.payloadJson) : {}),
    ...payloadPatch,
  };
  sqlite.prepare(`
    UPDATE email_events
    SET status = @status,
        opened_at = COALESCE(@openedAt, opened_at),
        clicked_at = COALESCE(@clickedAt, clicked_at),
        payload_json = @payloadJson,
        updated_at = @updatedAt
    WHERE id = @id
  `).run({
    id: row.id,
    status,
    openedAt,
    clickedAt,
    payloadJson: JSON.stringify(payload),
    updatedAt,
  });
  return row.id;
};

const listEmailEvents = async ({
  limit = 100,
  templateId = null,
  recipientEmail = null,
} = {}) => {
  const safeLimit = Math.max(1, Math.min(500, Number(limit || 100)));
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        dossier_id AS "dossierId",
        user_id AS "userId",
        template_id AS "templateId",
        recipient_email AS "recipientEmail",
        subject,
        status,
        provider,
        provider_message_id AS "providerMessageId",
        tags_json AS "tagsJson",
        error_code AS "errorCode",
        payload_json AS "payloadJson",
        error_message AS "errorMessage",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        sent_at AS "sentAt",
        opened_at AS "openedAt",
        clicked_at AS "clickedAt"
      FROM email_events
      WHERE ($1::text IS NULL OR template_id = $1)
        AND ($2::text IS NULL OR recipient_email = $2)
      ORDER BY created_at DESC
      LIMIT $3
    `, [templateId, recipientEmail, safeLimit]);
    return result.rows.map((item) => ({
      ...item,
      tags: item.tagsJson ? JSON.parse(item.tagsJson) : [],
      payload: item.payloadJson ? JSON.parse(item.payloadJson) : {},
    }));
  }

  const conditions = [];
  const params = [];
  if (templateId) {
    conditions.push('template_id = ?');
    params.push(templateId);
  }
  if (recipientEmail) {
    conditions.push('recipient_email = ?');
    params.push(recipientEmail);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = sqlite.prepare(`
    SELECT
      id,
      dossier_id AS dossierId,
      user_id AS userId,
      template_id AS templateId,
      recipient_email AS recipientEmail,
      subject,
      status,
      provider,
      provider_message_id AS providerMessageId,
      tags_json AS tagsJson,
      error_code AS errorCode,
      payload_json AS payloadJson,
      error_message AS errorMessage,
      created_at AS createdAt,
      updated_at AS updatedAt,
      sent_at AS sentAt,
      opened_at AS openedAt,
      clicked_at AS clickedAt
    FROM email_events
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `).all(...params);
  return rows.map((item) => ({
    ...item,
    tags: item.tagsJson ? JSON.parse(item.tagsJson) : [],
    payload: item.payloadJson ? JSON.parse(item.payloadJson) : {},
  }));
};

export {
  addEmailEvent,
  listEmailEvents,
  updateEmailEventByProviderMessageId,
};
