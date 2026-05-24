import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from './dbClient.js';

const nowIso = () => new Date().toISOString();

export const upsertPushDeviceToken = async ({ userId, platform, token, deviceLabel }) => {
  const normalizedToken = String(token || '').trim();
  if (!userId || !normalizedToken) throw new Error('PUSH_TOKEN_REQUIRED');

  const id = randomUUID();
  const now = nowIso();
  const safePlatform = String(platform || 'unknown').toLowerCase();
  const label = deviceLabel ? String(deviceLabel).slice(0, 120) : null;

  if (hasPostgres) {
    await query(`
      INSERT INTO push_device_tokens (id, user_id, platform, token, device_label, created_at, updated_at, revoked_at)
      VALUES ($1, $2, $3, $4, $5, $6, $6, NULL)
      ON CONFLICT (user_id, token)
      DO UPDATE SET
        platform = EXCLUDED.platform,
        device_label = EXCLUDED.device_label,
        updated_at = EXCLUDED.updated_at,
        revoked_at = NULL
    `, [id, userId, safePlatform, normalizedToken, label, now]);
    return { id, userId, platform: safePlatform, token: normalizedToken };
  }

  sqlite.prepare(`
    INSERT INTO push_device_tokens (id, user_id, platform, token, device_label, created_at, updated_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(user_id, token) DO UPDATE SET
      platform = excluded.platform,
      device_label = excluded.device_label,
      updated_at = excluded.updated_at,
      revoked_at = NULL
  `).run(id, userId, safePlatform, normalizedToken, label, now, now);

  return { id, userId, platform: safePlatform, token: normalizedToken };
};

export const revokePushDeviceToken = async ({ userId, token }) => {
  const normalizedToken = String(token || '').trim();
  if (!userId || !normalizedToken) throw new Error('PUSH_TOKEN_REQUIRED');
  const now = nowIso();

  if (hasPostgres) {
    await query(`
      UPDATE push_device_tokens
      SET revoked_at = $1, updated_at = $1
      WHERE user_id = $2 AND token = $3
    `, [now, userId, normalizedToken]);
    return { ok: true };
  }

  sqlite.prepare(`
    UPDATE push_device_tokens
    SET revoked_at = ?, updated_at = ?
    WHERE user_id = ? AND token = ?
  `).run(now, now, userId, normalizedToken);

  return { ok: true };
};

export const listActivePushTokensForUser = async (userId) => {
  if (!userId) return [];
  if (hasPostgres) {
    const result = await query(`
      SELECT token, platform, device_label AS "deviceLabel"
      FROM push_device_tokens
      WHERE user_id = $1 AND revoked_at IS NULL
      ORDER BY updated_at DESC
    `, [userId]);
    return result.rows;
  }

  return sqlite.prepare(`
    SELECT token, platform, device_label AS deviceLabel
    FROM push_device_tokens
    WHERE user_id = ? AND revoked_at IS NULL
    ORDER BY updated_at DESC
  `).all(userId);
};
