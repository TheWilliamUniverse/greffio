import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from '../../dbClient.js';
import { newAuditEventId } from './signatureUtils.js';

const nowIso = () => new Date().toISOString();

export const recordSignatureAuditEvent = async ({
  signatureRequestId,
  signatureId = null,
  eventType,
  actorType = 'system',
  actorUserId = null,
  actorEmail = null,
  ipAddress = null,
  userAgent = null,
  origin = null,
  referer = null,
  metadata = {},
}) => {
  const record = {
    id: newAuditEventId(),
    signatureRequestId,
    signatureId,
    eventType,
    actorType,
    actorUserId,
    actorEmail,
    ipAddress,
    userAgent,
    origin,
    referer,
    metadataJson: JSON.stringify(metadata || {}),
    createdAt: nowIso(),
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO signature_audit_events (
        id, signature_request_id, signature_id, event_type, actor_type, actor_user_id,
        actor_email, ip_address, user_agent, origin, referer, metadata_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [
      record.id, record.signatureRequestId, record.signatureId, record.eventType,
      record.actorType, record.actorUserId, record.actorEmail, record.ipAddress,
      record.userAgent, record.origin, record.referer, record.metadataJson, record.createdAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO signature_audit_events (
        id, signature_request_id, signature_id, event_type, actor_type, actor_user_id,
        actor_email, ip_address, user_agent, origin, referer, metadata_json, created_at
      ) VALUES (
        @id, @signatureRequestId, @signatureId, @eventType, @actorType, @actorUserId,
        @actorEmail, @ipAddress, @userAgent, @origin, @referer, @metadataJson, @createdAt
      )
    `).run(record);
  }

  return record;
};

export const listSignatureAuditEvents = async (signatureRequestId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT id, event_type AS "eventType", actor_type AS "actorType", actor_email AS "actorEmail",
             ip_address AS "ipAddress", metadata_json AS "metadataJson", created_at AS "createdAt"
      FROM signature_audit_events
      WHERE signature_request_id = $1
      ORDER BY created_at ASC
    `, [signatureRequestId]);
    return result.rows.map((row) => ({
      ...row,
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {},
    }));
  }
  return sqlite.prepare(`
    SELECT id, event_type AS eventType, actor_type AS actorType, actor_email AS actorEmail,
           ip_address AS ipAddress, metadata_json AS metadataJson, created_at AS createdAt
    FROM signature_audit_events
    WHERE signature_request_id = ?
    ORDER BY created_at ASC
  `).all(signatureRequestId).map((row) => ({
    ...row,
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {},
  }));
};
