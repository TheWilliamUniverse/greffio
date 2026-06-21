import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';
import {
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
} from './services/mfaService.js';
import { revokeTrustedDevicesForUser } from './mfaTrustedDeviceStore.js';

const nowIso = () => new Date().toISOString();

const getMfaRecord = async (userId) => {
  if (!userId) return null;
  if (hasPostgres) {
    const result = await query(`
      SELECT
        mfa_enabled AS "mfaEnabled",
        totp_secret_encrypted AS "totpSecretEncrypted",
        totp_pending_secret_encrypted AS "totpPendingSecretEncrypted"
      FROM users
      WHERE id = $1
      LIMIT 1
    `, [userId]);
    return result.rows[0] || null;
  }
  return sqlite.prepare(`
    SELECT
      mfa_enabled AS mfaEnabled,
      totp_secret_encrypted AS totpSecretEncrypted,
      totp_pending_secret_encrypted AS totpPendingSecretEncrypted
    FROM users
    WHERE id = ?
  `).get(userId) || null;
};

const countUnusedRecoveryCodes = async (userId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT COUNT(*)::int AS count
      FROM mfa_recovery_codes
      WHERE user_id = $1 AND used_at IS NULL
    `, [userId]);
    return Number(result.rows[0]?.count || 0);
  }
  const row = sqlite.prepare(`
    SELECT COUNT(*) AS count
    FROM mfa_recovery_codes
    WHERE user_id = ? AND used_at IS NULL
  `).get(userId);
  return Number(row?.count || 0);
};

const getMfaStatus = async (userId) => {
  const record = await getMfaRecord(userId);
  const recoveryCodesRemaining = await countUnusedRecoveryCodes(userId);
  return {
    mfaEnabled: Boolean(record?.mfaEnabled),
    totpEnabled: Boolean(record?.mfaEnabled),
    totpPending: Boolean(record?.totpPendingSecretEncrypted),
    recoveryCodesRemaining,
  };
};

const savePendingTotpSecret = async ({ userId, encryptedSecret }) => {
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE users
      SET totp_pending_secret_encrypted = $2, updated_at = $3
      WHERE id = $1
    `, [userId, encryptedSecret, updatedAt]);
    return;
  }
  sqlite.prepare(`
    UPDATE users
    SET totp_pending_secret_encrypted = ?, updated_at = ?
    WHERE id = ?
  `).run(encryptedSecret, updatedAt, userId);
};

const activateTotp = async ({ userId, encryptedSecret }) => {
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE users
      SET
        mfa_enabled = TRUE,
        totp_secret_encrypted = $2,
        totp_pending_secret_encrypted = NULL,
        updated_at = $3
      WHERE id = $1
    `, [userId, encryptedSecret, updatedAt]);
    return;
  }
  sqlite.prepare(`
    UPDATE users
    SET
      mfa_enabled = 1,
      totp_secret_encrypted = ?,
      totp_pending_secret_encrypted = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(encryptedSecret, updatedAt, userId);
};

const disableMfa = async (userId) => {
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE users
      SET
        mfa_enabled = FALSE,
        totp_secret_encrypted = NULL,
        totp_pending_secret_encrypted = NULL,
        updated_at = $2
      WHERE id = $1
    `, [userId, updatedAt]);
    await query('DELETE FROM mfa_recovery_codes WHERE user_id = $1', [userId]);
    await revokeTrustedDevicesForUser(userId);
    return;
  }
  sqlite.prepare(`
    UPDATE users
    SET
      mfa_enabled = 0,
      totp_secret_encrypted = NULL,
      totp_pending_secret_encrypted = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(updatedAt, userId);
  sqlite.prepare('DELETE FROM mfa_recovery_codes WHERE user_id = ?').run(userId);
  await revokeTrustedDevicesForUser(userId);
};

const getTotpSecret = async (userId, { pending = false } = {}) => {
  const record = await getMfaRecord(userId);
  if (!record) return null;
  const encrypted = pending ? record.totpPendingSecretEncrypted : record.totpSecretEncrypted;
  return decryptSecret(encrypted);
};

const replaceRecoveryCodes = async (userId) => {
  const codes = generateRecoveryCodes(8);
  const createdAt = nowIso();
  if (hasPostgres) {
    await query('DELETE FROM mfa_recovery_codes WHERE user_id = $1', [userId]);
    for (const code of codes) {
      await query(`
        INSERT INTO mfa_recovery_codes (id, user_id, code_hash, used_at, created_at)
        VALUES ($1, $2, $3, NULL, $4)
      `, [`mrc_${randomUUID()}`, userId, hashRecoveryCode(code), createdAt]);
    }
    return codes;
  }
  sqlite.prepare('DELETE FROM mfa_recovery_codes WHERE user_id = ?').run(userId);
  const insert = sqlite.prepare(`
    INSERT INTO mfa_recovery_codes (id, user_id, code_hash, used_at, created_at)
    VALUES (@id, @userId, @codeHash, NULL, @createdAt)
  `);
  for (const code of codes) {
    insert.run({
      id: `mrc_${randomUUID()}`,
      userId,
      codeHash: hashRecoveryCode(code),
      createdAt,
    });
  }
  return codes;
};

const consumeRecoveryCode = async ({ userId, code }) => {
  const normalized = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!normalized) return false;

  let rows = [];
  if (hasPostgres) {
    const result = await query(`
      SELECT id, code_hash AS "codeHash"
      FROM mfa_recovery_codes
      WHERE user_id = $1 AND used_at IS NULL
    `, [userId]);
    rows = result.rows;
  } else {
    rows = sqlite.prepare(`
      SELECT id, code_hash AS codeHash
      FROM mfa_recovery_codes
      WHERE user_id = ? AND used_at IS NULL
    `).all(userId);
  }

  const match = rows.find((row) => verifyRecoveryCode(normalized, row.codeHash));
  if (!match) return false;

  const usedAt = nowIso();
  if (hasPostgres) {
    await query('UPDATE mfa_recovery_codes SET used_at = $2 WHERE id = $1', [match.id, usedAt]);
  } else {
    sqlite.prepare('UPDATE mfa_recovery_codes SET used_at = ? WHERE id = ?').run(usedAt, match.id);
  }
  return true;
};

const isMfaEnabled = async (userId) => {
  const record = await getMfaRecord(userId);
  return Boolean(record?.mfaEnabled);
};

const listUsersWithTotpMfa = async () => {
  const whereClause = hasPostgres
    ? `mfa_enabled = TRUE OR totp_secret_encrypted IS NOT NULL OR totp_pending_secret_encrypted IS NOT NULL`
    : `mfa_enabled = 1 OR totp_secret_encrypted IS NOT NULL OR totp_pending_secret_encrypted IS NOT NULL`;
  if (hasPostgres) {
    const result = await query(`
      SELECT id, email, role, mfa_enabled AS "mfaEnabled"
      FROM users
      WHERE ${whereClause}
      ORDER BY email ASC
    `);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT id, email, role, mfa_enabled AS mfaEnabled
    FROM users
    WHERE ${whereClause}
    ORDER BY email ASC
  `).all();
};

/** Désactive toute la MFA TOTP (secrets, codes de secours, appareils de confiance). */
const resetAllTotpMfa = async () => {
  const users = await listUsersWithTotpMfa();
  const updatedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE users
      SET
        mfa_enabled = FALSE,
        totp_secret_encrypted = NULL,
        totp_pending_secret_encrypted = NULL,
        updated_at = $1
      WHERE mfa_enabled = TRUE
         OR totp_secret_encrypted IS NOT NULL
         OR totp_pending_secret_encrypted IS NOT NULL
    `, [updatedAt]);
    await query('DELETE FROM mfa_recovery_codes');
    await query(
      'UPDATE mfa_trusted_devices SET revoked_at = $1 WHERE revoked_at IS NULL',
      [updatedAt],
    );
  } else {
    sqlite.prepare(`
      UPDATE users
      SET
        mfa_enabled = 0,
        totp_secret_encrypted = NULL,
        totp_pending_secret_encrypted = NULL,
        updated_at = ?
      WHERE mfa_enabled = 1
         OR totp_secret_encrypted IS NOT NULL
         OR totp_pending_secret_encrypted IS NOT NULL
    `).run(updatedAt);
    sqlite.prepare('DELETE FROM mfa_recovery_codes').run();
    sqlite.prepare(
      'UPDATE mfa_trusted_devices SET revoked_at = ? WHERE revoked_at IS NULL',
    ).run(updatedAt);
  }
  return {
    resetCount: users.length,
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
    })),
  };
};

export {
  activateTotp,
  consumeRecoveryCode,
  disableMfa,
  getMfaRecord,
  getMfaStatus,
  getTotpSecret,
  isMfaEnabled,
  listUsersWithTotpMfa,
  replaceRecoveryCodes,
  resetAllTotpMfa,
  savePendingTotpSecret,
};
