import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from '../dbClient.js';
import { getDocumentEditorSessionTtlMinutes } from './documentWorkspacePolicy.js';
import { hashAccessToken } from './documentVersionService.js';

const nowIso = () => new Date().toISOString();

const mapSessionRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    dossierId: row.dossierId ?? row.dossier_id,
    docKey: row.docKey ?? row.doc_key,
    documentVersionId: row.documentVersionId ?? row.document_version_id ?? null,
    provider: row.provider,
    status: row.status,
    accessTokenHash: row.accessTokenHash ?? row.access_token_hash,
    userId: row.userId ?? row.user_id,
    userEmail: row.userEmail ?? row.user_email ?? null,
    fileFormat: row.fileFormat ?? row.file_format,
    sourceStorageUrl: row.sourceStorageUrl ?? row.source_storage_url,
    sourceSha256: row.sourceSha256 ?? row.source_sha256 ?? null,
    resultVersionId: row.resultVersionId ?? row.result_version_id ?? null,
    expiresAt: row.expiresAt ?? row.expires_at,
    openedAt: row.openedAt ?? row.opened_at ?? null,
    lastCallbackAt: row.lastCallbackAt ?? row.last_callback_at ?? null,
    closedAt: row.closedAt ?? row.closed_at ?? null,
    metadata: (() => {
      const raw = row.metadataJson ?? row.metadata_json;
      if (!raw) return {};
      if (typeof raw === 'object') return raw;
      try {
        return JSON.parse(raw);
      } catch (_error) {
        return {};
      }
    })(),
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  };
};

const insertSession = async (session) => {
  if (hasPostgres) {
    await query(`
      INSERT INTO document_editor_sessions (
        id, dossier_id, doc_key, document_version_id, provider, status,
        access_token_hash, user_id, user_email, file_format, source_storage_url,
        source_sha256, result_version_id, expires_at, opened_at, last_callback_at,
        closed_at, metadata_json, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      )
    `, [
      session.id,
      session.dossierId,
      session.docKey,
      session.documentVersionId,
      session.provider,
      session.status,
      session.accessTokenHash,
      session.userId,
      session.userEmail,
      session.fileFormat,
      session.sourceStorageUrl,
      session.sourceSha256,
      session.resultVersionId,
      session.expiresAt,
      session.openedAt,
      session.lastCallbackAt,
      session.closedAt,
      JSON.stringify(session.metadata || {}),
      session.createdAt,
      session.updatedAt,
    ]);
    return;
  }
  sqlite.prepare(`
    INSERT INTO document_editor_sessions (
      id, dossier_id, doc_key, document_version_id, provider, status,
      access_token_hash, user_id, user_email, file_format, source_storage_url,
      source_sha256, result_version_id, expires_at, opened_at, last_callback_at,
      closed_at, metadata_json, created_at, updated_at
    ) VALUES (
      @id, @dossierId, @docKey, @documentVersionId, @provider, @status,
      @accessTokenHash, @userId, @userEmail, @fileFormat, @sourceStorageUrl,
      @sourceSha256, @resultVersionId, @expiresAt, @openedAt, @lastCallbackAt,
      @closedAt, @metadataJson, @createdAt, @updatedAt
    )
  `).run({
    ...session,
    metadataJson: JSON.stringify(session.metadata || {}),
  });
};

export const createSession = async ({
  dossierId,
  docKey,
  documentVersionId = null,
  provider,
  userId,
  userEmail = null,
  fileFormat,
  sourceStorageUrl,
  sourceSha256 = null,
  metadata = {},
}) => {
  const accessToken = randomUUID();
  const timestamp = nowIso();
  const ttlMinutes = getDocumentEditorSessionTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const session = {
    id: randomUUID(),
    dossierId,
    docKey,
    documentVersionId,
    provider,
    status: 'created',
    accessTokenHash: hashAccessToken(accessToken),
    userId,
    userEmail,
    fileFormat,
    sourceStorageUrl,
    sourceSha256,
    resultVersionId: null,
    expiresAt,
    openedAt: null,
    lastCallbackAt: null,
    closedAt: null,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await insertSession(session);
  return { session: mapSessionRow(session), accessToken };
};

export const getSession = async (sessionId) => {
  if (hasPostgres) {
    const result = await query('SELECT * FROM document_editor_sessions WHERE id = $1 LIMIT 1', [sessionId]);
    return mapSessionRow(result.rows[0]);
  }
  return mapSessionRow(sqlite.prepare('SELECT * FROM document_editor_sessions WHERE id = ? LIMIT 1').get(sessionId));
};

export const getSessionByToken = async (accessToken) => {
  const tokenHash = hashAccessToken(accessToken);
  if (hasPostgres) {
    const result = await query(
      'SELECT * FROM document_editor_sessions WHERE access_token_hash = $1 LIMIT 1',
      [tokenHash],
    );
    return mapSessionRow(result.rows[0]);
  }
  return mapSessionRow(
    sqlite.prepare('SELECT * FROM document_editor_sessions WHERE access_token_hash = ? LIMIT 1').get(tokenHash),
  );
};

const updateSessionStatus = async (sessionId, patch) => {
  const timestamp = nowIso();
  if (hasPostgres) {
    const fields = [];
    const values = [];
    let index = 1;
    Object.entries(patch).forEach(([key, value]) => {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index += 1;
    });
    fields.push(`updated_at = $${index}`);
    values.push(timestamp);
    index += 1;
    values.push(sessionId);
    await query(
      `UPDATE document_editor_sessions SET ${fields.join(', ')} WHERE id = $${index}`,
      values,
    );
    return getSession(sessionId);
  }
  const assignments = Object.keys(patch).map((key) => `${key} = @${key}`).join(', ');
  sqlite.prepare(`UPDATE document_editor_sessions SET ${assignments}, updated_at = @updatedAt WHERE id = @id`).run({
    ...patch,
    updatedAt: timestamp,
    id: sessionId,
  });
  return getSession(sessionId);
};

export const markOpened = (sessionId) => updateSessionStatus(sessionId, {
  status: 'opened',
  opened_at: nowIso(),
});

export const markSaving = (sessionId) => updateSessionStatus(sessionId, {
  status: 'saving',
  last_callback_at: nowIso(),
});

export const markSaved = async (sessionId, resultVersionId, metadataPatch = null) => {
  const session = await getSession(sessionId);
  const patch = {
    status: 'saved',
    result_version_id: resultVersionId,
    last_callback_at: nowIso(),
  };
  if (metadataPatch && typeof metadataPatch === 'object') {
    patch.metadata_json = JSON.stringify({
      ...(session?.metadata || {}),
      ...metadataPatch,
    });
  }
  return updateSessionStatus(sessionId, patch);
};

export const mergeSessionMetadata = async (sessionId, metadataPatch = {}) => {
  const session = await getSession(sessionId);
  if (!session) return null;
  const nextMetadata = {
    ...(session.metadata || {}),
    ...metadataPatch,
  };
  return updateSessionStatus(sessionId, {
    metadata_json: JSON.stringify(nextMetadata),
  });
};

export const markClosed = (sessionId) => updateSessionStatus(sessionId, {
  status: 'closed',
  closed_at: nowIso(),
});

export const isSessionExpired = (session) => {
  if (!session?.expiresAt) return true;
  return Date.parse(session.expiresAt) <= Date.now();
};
