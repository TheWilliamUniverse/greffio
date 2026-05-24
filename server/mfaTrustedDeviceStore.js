import { createHash, randomBytes } from 'node:crypto';
import { query } from './dbClient.js';
import { sqlite } from './database.js';
import { parseDeviceLabel } from './utils/loginContext.js';

const TRUSTED_DEVICE_TTL_DAYS = 30;
const usePostgres = Boolean(process.env.DATABASE_URL);

const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');

const generateDeviceToken = () => randomBytes(32).toString('hex');

export const createTrustedDevice = async (userId, req = {}) => {
  const token = generateDeviceToken();
  const tokenHash = hashToken(token);
  const id = `mfa_dev_${randomBytes(8).toString('hex')}`;
  const deviceLabel = parseDeviceLabel(req.headers?.['user-agent'] || '');
  const userAgent = String(req.headers?.['user-agent'] || '').slice(0, 500);
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  if (usePostgres) {
    await query(
      `INSERT INTO mfa_trusted_devices (id, user_id, token_hash, device_label, user_agent, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, tokenHash, deviceLabel, userAgent, expiresAt, createdAt],
    );
  } else {
    sqlite.prepare(
      `INSERT INTO mfa_trusted_devices (id, user_id, token_hash, device_label, user_agent, expires_at, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).run(id, userId, tokenHash, deviceLabel, userAgent, expiresAt, createdAt);
  }

  return { deviceToken: token, expiresAt, deviceLabel, ttlDays: TRUSTED_DEVICE_TTL_DAYS };
};

export const verifyTrustedDevice = async (userId, deviceToken) => {
  if (!userId || !deviceToken) return false;
  const tokenHash = hashToken(deviceToken);
  const now = new Date().toISOString();

  if (usePostgres) {
    const result = await query(
      `SELECT id FROM mfa_trusted_devices
       WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > $3
       LIMIT 1`,
      [userId, tokenHash, now],
    );
    return Boolean(result.rows?.[0]?.id);
  }

  const row = sqlite.prepare(
    `SELECT id FROM mfa_trusted_devices
     WHERE user_id = ? AND token_hash = ? AND revoked_at IS NULL AND expires_at > ?
     LIMIT 1`,
  ).get(userId, tokenHash, now);
  return Boolean(row?.id);
};

export const hasValidTrustedDevice = async (userId, deviceToken) => verifyTrustedDevice(userId, deviceToken);

export const revokeTrustedDevicesForUser = async (userId) => {
  const revokedAt = new Date().toISOString();
  if (usePostgres) {
    await query(
      'UPDATE mfa_trusted_devices SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL',
      [userId, revokedAt],
    );
    return;
  }
  sqlite.prepare(
    'UPDATE mfa_trusted_devices SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
  ).run(revokedAt, userId);
};
