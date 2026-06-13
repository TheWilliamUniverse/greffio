import { randomUUID } from 'node:crypto';
import { hasPostgres, query, sqlite } from '../../dbClient.js';
import { generateOtpCode, hashOtp, verifyOtpHash } from './signatureUtils.js';
import { recordSignatureAuditEvent } from './signatureAuditService.js';

const nowIso = () => new Date().toISOString();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const getLatestOtp = async (signatureRequestId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT id, otp_hash AS "otpHash", attempts, max_attempts AS "maxAttempts",
             expires_at AS "expiresAt", consumed_at AS "consumedAt", created_at AS "createdAt"
      FROM signature_otps
      WHERE signature_request_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [signatureRequestId]);
    return result.rows[0] || null;
  }
  return sqlite.prepare(`
    SELECT id, otp_hash AS otpHash, attempts, max_attempts AS maxAttempts,
           expires_at AS expiresAt, consumed_at AS consumedAt, created_at AS createdAt
    FROM signature_otps
    WHERE signature_request_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(signatureRequestId) || null;
};

export const sendSignatureOtp = async ({
  signatureRequestId,
  signerEmail,
  sendEmailFn,
  ipAddress,
  userAgent,
}) => {
  const latest = await getLatestOtp(signatureRequestId);
  if (latest && !latest.consumedAt) {
    const createdMs = new Date(latest.createdAt).getTime();
    if (Date.now() - createdMs < RESEND_COOLDOWN_MS) {
      return { ok: false, error: 'SIGNATURE_OTP_RATE_LIMIT', retryAfterSeconds: 60 };
    }
  }

  const code = generateOtpCode();
  const otpHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const record = {
    id: randomUUID(),
    signatureRequestId,
    otpHash,
    purpose: 'signature_email_verification',
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt,
    consumedAt: null,
    createdAt: nowIso(),
  };

  if (hasPostgres) {
    await query(`
      INSERT INTO signature_otps (id, signature_request_id, otp_hash, purpose, attempts, max_attempts, expires_at, consumed_at, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      record.id, record.signatureRequestId, record.otpHash, record.purpose,
      record.attempts, record.maxAttempts, record.expiresAt, record.consumedAt, record.createdAt,
    ]);
  } else {
    sqlite.prepare(`
      INSERT INTO signature_otps (id, signature_request_id, otp_hash, purpose, attempts, max_attempts, expires_at, consumed_at, created_at)
      VALUES (@id, @signatureRequestId, @otpHash, @purpose, @attempts, @maxAttempts, @expiresAt, @consumedAt, @createdAt)
    `).run(record);
  }

  if (typeof sendEmailFn === 'function') {
    await sendEmailFn({ email: signerEmail, code });
  }

  await recordSignatureAuditEvent({
    signatureRequestId,
    eventType: 'otp_sent',
    actorType: 'system',
    actorEmail: signerEmail,
    ipAddress,
    userAgent,
  });

  return { ok: true, expiresInSeconds: OTP_TTL_MS / 1000, maskedEmail: signerEmail.replace(/(.{2}).+(@.+)/, '$1***$2') };
};

export const verifySignatureOtp = async ({
  signatureRequestId,
  code,
  ipAddress,
  userAgent,
}) => {
  const latest = await getLatestOtp(signatureRequestId);
  if (!latest || latest.consumedAt) {
    return { ok: false, error: 'SIGNATURE_OTP_INVALID' };
  }
  if (new Date(latest.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: 'SIGNATURE_OTP_EXPIRED' };
  }
  if (latest.attempts >= latest.maxAttempts) {
    return { ok: false, error: 'SIGNATURE_OTP_TOO_MANY_ATTEMPTS' };
  }

  const valid = verifyOtpHash(code, latest.otpHash);
  const attempts = latest.attempts + 1;

  if (hasPostgres) {
    await query('UPDATE signature_otps SET attempts = $1 WHERE id = $2', [attempts, latest.id]);
  } else {
    sqlite.prepare('UPDATE signature_otps SET attempts = ? WHERE id = ?').run(attempts, latest.id);
  }

  if (!valid) {
    await recordSignatureAuditEvent({
      signatureRequestId,
      eventType: 'otp_failed',
      actorType: 'signer',
      ipAddress,
      userAgent,
      metadata: { attempts },
    });
    return { ok: false, error: attempts >= latest.maxAttempts ? 'SIGNATURE_OTP_TOO_MANY_ATTEMPTS' : 'SIGNATURE_OTP_INVALID' };
  }

  const consumedAt = nowIso();
  if (hasPostgres) {
    await query('UPDATE signature_otps SET consumed_at = $1 WHERE id = $2', [consumedAt, latest.id]);
  } else {
    sqlite.prepare('UPDATE signature_otps SET consumed_at = ? WHERE id = ?').run(consumedAt, latest.id);
  }

  await recordSignatureAuditEvent({
    signatureRequestId,
    eventType: 'otp_verified',
    actorType: 'signer',
    ipAddress,
    userAgent,
  });

  return { ok: true, verified: true };
};

export const isSignatureOtpVerified = async (signatureRequestId) => {
  if (hasPostgres) {
    const result = await query(`
      SELECT id FROM signature_otps
      WHERE signature_request_id = $1 AND consumed_at IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `, [signatureRequestId]);
    return Boolean(result.rows[0]);
  }
  const row = sqlite.prepare(`
    SELECT id FROM signature_otps
    WHERE signature_request_id = ? AND consumed_at IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(signatureRequestId);
  return Boolean(row);
};
