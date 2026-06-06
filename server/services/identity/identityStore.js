import crypto from 'node:crypto';
import { hasPostgres, query, sqlite } from '../../dbClient.js';

const mapRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    result: JSON.parse(row.result_json || '{}'),
  };
};

export const getLatestIdentityVerification = async (dossierId) => {
  if (hasPostgres) {
    const result = await query(
      'SELECT * FROM identity_verifications WHERE dossier_id = $1 ORDER BY created_at DESC LIMIT 1',
      [dossierId],
    );
    return mapRow(result.rows[0]);
  }
  const row = sqlite.prepare(
    'SELECT * FROM identity_verifications WHERE dossier_id = ? ORDER BY created_at DESC LIMIT 1',
  ).get(dossierId);
  return mapRow(row);
};

export const upsertIdentityVerification = async (entry) => {
  const now = new Date().toISOString();
  const id = entry.id || crypto.randomUUID();
  const payload = {
    id,
    dossier_id: entry.dossierId,
    user_id: entry.userId || null,
    provider: entry.provider || 'didit',
    provider_session_id: entry.providerSessionId || null,
    status: entry.status || 'not_started',
    verification_url: entry.verificationUrl || null,
    result_json: JSON.stringify(entry.result || {}),
    triggered_by_doc_key: entry.triggeredByDocKey || 'identity_proof',
    created_at: entry.createdAt || now,
    updated_at: now,
  };

  if (hasPostgres) {
    await query(
      `INSERT INTO identity_verifications (
        id, dossier_id, user_id, provider, provider_session_id, status, verification_url, result_json, triggered_by_doc_key, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET
        provider_session_id = EXCLUDED.provider_session_id,
        status = EXCLUDED.status,
        verification_url = EXCLUDED.verification_url,
        result_json = EXCLUDED.result_json,
        updated_at = EXCLUDED.updated_at`,
      Object.values(payload),
    );
  } else {
    sqlite.prepare(`
      INSERT INTO identity_verifications (
        id, dossier_id, user_id, provider, provider_session_id, status, verification_url, result_json, triggered_by_doc_key, created_at, updated_at
      ) VALUES (@id,@dossier_id,@user_id,@provider,@provider_session_id,@status,@verification_url,@result_json,@triggered_by_doc_key,@created_at,@updated_at)
      ON CONFLICT(id) DO UPDATE SET
        provider_session_id = excluded.provider_session_id,
        status = excluded.status,
        verification_url = excluded.verification_url,
        result_json = excluded.result_json,
        updated_at = excluded.updated_at
    `).run(payload);
  }
  return getLatestIdentityVerification(entry.dossierId);
};

export const updateIdentityVerificationBySessionId = async (providerSessionId, patch = {}) => {
  const now = new Date().toISOString();
  if (hasPostgres) {
    const result = await query(
      `UPDATE identity_verifications SET
        status = COALESCE($2, status),
        result_json = COALESCE($3, result_json),
        updated_at = $4
      WHERE provider_session_id = $1
      RETURNING *`,
      [
        providerSessionId,
        patch.status || null,
        patch.result ? JSON.stringify(patch.result) : null,
        now,
      ],
    );
    return mapRow(result.rows[0]);
  }
  const existing = sqlite.prepare(
    'SELECT * FROM identity_verifications WHERE provider_session_id = ? LIMIT 1',
  ).get(providerSessionId);
  if (!existing) return null;
  const nextResult = patch.result ? JSON.stringify(patch.result) : existing.result_json;
  sqlite.prepare(`
    UPDATE identity_verifications
    SET status = ?, result_json = ?, updated_at = ?
    WHERE provider_session_id = ?
  `).run(patch.status || existing.status, nextResult, now, providerSessionId);
  return getLatestIdentityVerification(existing.dossier_id);
};
