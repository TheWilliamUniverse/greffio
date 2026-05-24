import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';
import { encryptSecret, decryptSecret } from './services/mfaService.js';
import { maskFrenchPhone } from './emails/brevoSmsProvider.js';

const nowIso = () => new Date().toISOString();

const hashToken = (token) => createHash('sha256').update(String(token || '')).digest('hex');

const hashSmsCode = (code) => {
  const normalized = String(code || '').replace(/\D/g, '');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(normalized, salt, 32).toString('hex');
  return `${salt}:${hash}`;
};

const verifySmsCode = (code, storedHash) => {
  const normalized = String(code || '').replace(/\D/g, '');
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const supplied = scryptSync(normalized, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
};

const generateSmsCode = () => String(Math.floor(100000 + Math.random() * 900000));

const createCredentialUnlock = async ({
  userId,
  temporaryPassword,
  phone,
  expirationMinutes = 60,
}) => {
  const token = randomBytes(24).toString('hex');
  const smsCode = generateSmsCode();
  const record = {
    id: `cut_${randomUUID()}`,
    userId,
    tokenHash: hashToken(token),
    smsCodeHash: hashSmsCode(smsCode),
    passwordEncrypted: encryptSecret(temporaryPassword),
    phoneMasked: maskFrenchPhone(phone),
    expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString(),
    smsSentAt: null,
    verifiedAt: null,
    consumedAt: null,
    createdAt: nowIso(),
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO credential_unlock_tokens (
        id, user_id, token_hash, sms_code_hash, password_encrypted, phone_masked,
        expires_at, sms_sent_at, verified_at, consumed_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      record.id,
      record.userId,
      record.tokenHash,
      record.smsCodeHash,
      record.passwordEncrypted,
      record.phoneMasked,
      record.expiresAt,
      record.smsSentAt,
      record.verifiedAt,
      record.consumedAt,
      record.createdAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO credential_unlock_tokens (
        id, user_id, token_hash, sms_code_hash, password_encrypted, phone_masked,
        expires_at, sms_sent_at, verified_at, consumed_at, created_at
      ) VALUES (
        @id, @userId, @tokenHash, @smsCodeHash, @passwordEncrypted, @phoneMasked,
        @expiresAt, @smsSentAt, @verifiedAt, @consumedAt, @createdAt
      )
    `).run(record);
  }

  return {
    id: record.id,
    token,
    smsCode,
    expiresAt: record.expiresAt,
    phoneMasked: record.phoneMasked,
  };
};

const getUnlockByToken = async (token) => {
  const tokenHash = hashToken(token);
  if (hasPostgres) {
    const result = await query(`
      SELECT
        id,
        user_id AS "userId",
        sms_code_hash AS "smsCodeHash",
        password_encrypted AS "passwordEncrypted",
        phone_masked AS "phoneMasked",
        expires_at AS "expiresAt",
        consumed_at AS "consumedAt"
      FROM credential_unlock_tokens
      WHERE token_hash = $1
      LIMIT 1
    `, [tokenHash]);
    return result.rows[0] || null;
  }
  return sqlite.prepare(`
    SELECT
      id,
      user_id AS userId,
      sms_code_hash AS smsCodeHash,
      password_encrypted AS passwordEncrypted,
      phone_masked AS phoneMasked,
      expires_at AS expiresAt,
      consumed_at AS consumedAt
    FROM credential_unlock_tokens
    WHERE token_hash = ?
  `).get(tokenHash) || null;
};

const markSmsSent = async (id) => {
  const sentAt = nowIso();
  if (hasPostgres) {
    await query('UPDATE credential_unlock_tokens SET sms_sent_at = $1 WHERE id = $2', [sentAt, id]);
    return;
  }
  sqlite.prepare('UPDATE credential_unlock_tokens SET sms_sent_at = ? WHERE id = ?').run(sentAt, id);
};

const verifyAndConsumeUnlock = async ({ token, code }) => {
  const row = await getUnlockByToken(token);
  if (!row) return { ok: false, error: 'CREDENTIAL_UNLOCK_NOT_FOUND' };
  if (row.consumedAt) return { ok: false, error: 'CREDENTIAL_UNLOCK_ALREADY_USED' };
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    return { ok: false, error: 'CREDENTIAL_UNLOCK_EXPIRED' };
  }
  if (!verifySmsCode(code, row.smsCodeHash)) {
    return { ok: false, error: 'CREDENTIAL_UNLOCK_CODE_INVALID' };
  }

  const consumedAt = nowIso();
  if (hasPostgres) {
    await query(`
      UPDATE credential_unlock_tokens
      SET verified_at = $1, consumed_at = $1
      WHERE id = $2
    `, [consumedAt, row.id]);
  } else {
    sqlite.prepare(`
      UPDATE credential_unlock_tokens
      SET verified_at = ?, consumed_at = ?
      WHERE id = ?
    `).run(consumedAt, consumedAt, row.id);
  }

  const temporaryPassword = decryptSecret(row.passwordEncrypted);
  if (!temporaryPassword) return { ok: false, error: 'CREDENTIAL_UNLOCK_DECRYPT_FAILED' };

  return {
    ok: true,
    userId: row.userId,
    temporaryPassword,
  };
};

export {
  createCredentialUnlock,
  getUnlockByToken,
  markSmsSent,
  verifyAndConsumeUnlock,
};
