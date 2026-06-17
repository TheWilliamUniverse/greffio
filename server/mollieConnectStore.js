import { createHash, randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';
import { decryptSecret, encryptSecret } from './services/mfaService.js';

const nowIso = () => new Date().toISOString();
const hashState = (state) => createHash('sha256').update(String(state || '')).digest('hex');

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

export const createMollieConnectOAuthState = async ({ userId, state }) => {
  const record = {
    id: `mcos_${randomUUID()}`,
    stateHash: hashState(state),
    userId,
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString(),
    consumedAt: null,
    createdAt: nowIso(),
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO mollie_connect_oauth_states (
        id, state_hash, user_id, expires_at, consumed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      record.id,
      record.stateHash,
      record.userId,
      record.expiresAt,
      record.consumedAt,
      record.createdAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO mollie_connect_oauth_states (
        id, state_hash, user_id, expires_at, consumed_at, created_at
      ) VALUES (
        @id, @stateHash, @userId, @expiresAt, @consumedAt, @createdAt
      )
    `).run(record);
  }

  return record;
};

export const consumeMollieConnectOAuthState = async ({ state }) => {
  const stateHash = hashState(state);
  const row = hasPostgres
    ? (await query(`
        SELECT id, user_id AS "userId", expires_at AS "expiresAt", consumed_at AS "consumedAt"
        FROM mollie_connect_oauth_states
        WHERE state_hash = $1
        LIMIT 1
      `, [stateHash])).rows[0] || null
    : sqlite.prepare(`
        SELECT id, user_id AS userId, expires_at AS expiresAt, consumed_at AS consumedAt
        FROM mollie_connect_oauth_states
        WHERE state_hash = ?
        LIMIT 1
      `).get(stateHash) || null;

  if (!row) return { ok: false, error: 'MOLLIE_CONNECT_STATE_INVALID' };
  if (row.consumedAt) return { ok: false, error: 'MOLLIE_CONNECT_STATE_USED' };
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    return { ok: false, error: 'MOLLIE_CONNECT_STATE_EXPIRED' };
  }

  const consumedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE mollie_connect_oauth_states
      SET consumed_at = $1
      WHERE id = $2 AND consumed_at IS NULL
    `, [consumedAt, row.id]);
  } else {
    sqlite.prepare(`
      UPDATE mollie_connect_oauth_states
      SET consumed_at = ?
      WHERE id = ? AND consumed_at IS NULL
    `).run(consumedAt, row.id);
  }

  return { ok: true, userId: row.userId };
};

export const upsertMollieConnectAccount = async ({
  organizationId,
  accessToken,
  refreshToken,
  expiresIn = null,
  scope = null,
  profileId = null,
  initiatedByUserId = null,
  metadata = {},
}) => {
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
    : null;
  const timestamp = nowIso();
  const record = {
    id: `mca_${randomUUID()}`,
    organizationId,
    accessTokenEncrypted: encryptSecret(accessToken),
    refreshTokenEncrypted: encryptSecret(refreshToken),
    tokenExpiresAt,
    scope,
    profileId,
    status: 'connected',
    initiatedByUserId,
    metadataJson: JSON.stringify(metadata || {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO mollie_connect_accounts (
        id, organization_id, access_token_encrypted, refresh_token_encrypted,
        token_expires_at, scope, profile_id, status, initiated_by_user_id,
        metadata_json, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (organization_id) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        scope = EXCLUDED.scope,
        profile_id = COALESCE(EXCLUDED.profile_id, mollie_connect_accounts.profile_id),
        status = 'connected',
        initiated_by_user_id = COALESCE(EXCLUDED.initiated_by_user_id, mollie_connect_accounts.initiated_by_user_id),
        metadata_json = EXCLUDED.metadata_json,
        updated_at = EXCLUDED.updated_at
    `, [
      record.id,
      record.organizationId,
      record.accessTokenEncrypted,
      record.refreshTokenEncrypted,
      record.tokenExpiresAt,
      record.scope,
      record.profileId,
      record.status,
      record.initiatedByUserId,
      record.metadataJson,
      record.createdAt,
      record.updatedAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO mollie_connect_accounts (
        id, organization_id, access_token_encrypted, refresh_token_encrypted,
        token_expires_at, scope, profile_id, status, initiated_by_user_id,
        metadata_json, created_at, updated_at
      ) VALUES (
        @id, @organizationId, @accessTokenEncrypted, @refreshTokenEncrypted,
        @tokenExpiresAt, @scope, @profileId, @status, @initiatedByUserId,
        @metadataJson, @createdAt, @updatedAt
      )
      ON CONFLICT(organization_id) DO UPDATE SET
        access_token_encrypted = excluded.access_token_encrypted,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        token_expires_at = excluded.token_expires_at,
        scope = excluded.scope,
        profile_id = COALESCE(excluded.profile_id, profile_id),
        status = 'connected',
        initiated_by_user_id = COALESCE(excluded.initiated_by_user_id, initiated_by_user_id),
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `).run(record);
  }

  return { organizationId, tokenExpiresAt, scope };
};

export const getMollieConnectAccountByOrganizationId = async (organizationId) => {
  const row = hasPostgres
    ? (await query(`
        SELECT
          id,
          organization_id AS "organizationId",
          access_token_encrypted AS "accessTokenEncrypted",
          refresh_token_encrypted AS "refreshTokenEncrypted",
          token_expires_at AS "tokenExpiresAt",
          scope,
          profile_id AS "profileId",
          status,
          metadata_json AS "metadataJson",
          updated_at AS "updatedAt"
        FROM mollie_connect_accounts
        WHERE organization_id = $1
        LIMIT 1
      `, [organizationId])).rows[0] || null
    : sqlite.prepare(`
        SELECT
          id,
          organization_id AS organizationId,
          access_token_encrypted AS accessTokenEncrypted,
          refresh_token_encrypted AS refreshTokenEncrypted,
          token_expires_at AS tokenExpiresAt,
          scope,
          profile_id AS profileId,
          status,
          metadata_json AS metadataJson,
          updated_at AS updatedAt
        FROM mollie_connect_accounts
        WHERE organization_id = ?
        LIMIT 1
      `).get(organizationId) || null;

  if (!row) return null;
  return {
    ...row,
    accessToken: decryptSecret(row.accessTokenEncrypted),
    refreshToken: decryptSecret(row.refreshTokenEncrypted),
    metadata: JSON.parse(row.metadataJson || '{}'),
  };
};

export const countMollieConnectAccounts = async () => {
  if (hasPostgres) {
    const result = await query(`
      SELECT COUNT(*)::int AS count
      FROM mollie_connect_accounts
      WHERE status = 'connected'
    `);
    return result.rows[0]?.count || 0;
  }
  const row = sqlite.prepare(`
    SELECT COUNT(*) AS count
    FROM mollie_connect_accounts
    WHERE status = 'connected'
  `).get();
  return row?.count || 0;
};

export const updateMollieConnectAccountTokens = async ({
  organizationId,
  accessToken,
  refreshToken,
  expiresIn = null,
  scope = null,
}) => {
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
    : null;
  const updatedAt = nowIso();

  if (hasPostgres) {
    await query(`
      UPDATE mollie_connect_accounts
      SET
        access_token_encrypted = $1,
        refresh_token_encrypted = $2,
        token_expires_at = $3,
        scope = COALESCE($4, scope),
        status = 'connected',
        updated_at = $5
      WHERE organization_id = $6
    `, [
      encryptSecret(accessToken),
      encryptSecret(refreshToken),
      tokenExpiresAt,
      scope,
      updatedAt,
      organizationId,
    ]);
  } else {
    sqlite.prepare(`
      UPDATE mollie_connect_accounts
      SET
        access_token_encrypted = ?,
        refresh_token_encrypted = ?,
        token_expires_at = ?,
        scope = COALESCE(?, scope),
        status = 'connected',
        updated_at = ?
      WHERE organization_id = ?
    `).run(
      encryptSecret(accessToken),
      encryptSecret(refreshToken),
      tokenExpiresAt,
      scope,
      updatedAt,
      organizationId,
    );
  }
};
