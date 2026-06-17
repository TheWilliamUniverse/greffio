import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

/** @type {Map<string, { codeHash: string, expiresAt: number, lastSentAt: number, attempts: number }>} */
const activeCodes = new Map();

const hashCode = (code) => {
  const normalized = String(code || '').replace(/\D/g, '');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(normalized, salt, 32).toString('hex');
  return `${salt}:${hash}`;
};

const verifyCodeHash = (code, storedHash) => {
  const normalized = String(code || '').replace(/\D/g, '');
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash || normalized.length !== 6) return false;
  const supplied = scryptSync(normalized, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
};

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const canSendOpsStepUpCode = (userId) => {
  const entry = activeCodes.get(String(userId || ''));
  if (!entry || entry.expiresAt <= Date.now()) return { ok: true, retryAfterSeconds: 0 };
  const elapsed = Date.now() - entry.lastSentAt;
  if (elapsed >= RESEND_COOLDOWN_MS) return { ok: true, retryAfterSeconds: 0 };
  return {
    ok: false,
    retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
  };
};

export const issueOpsStepUpCode = (userId) => {
  const key = String(userId || '');
  const sendCheck = canSendOpsStepUpCode(userId);
  if (!sendCheck.ok) {
    const error = new Error('OPS_STEP_UP_COOLDOWN');
    error.retryAfterSeconds = sendCheck.retryAfterSeconds;
    throw error;
  }
  const code = generateCode();
  const now = Date.now();
  activeCodes.set(key, {
    codeHash: hashCode(code),
    expiresAt: now + CODE_TTL_MS,
    lastSentAt: now,
    attempts: 0,
  });
  return { code, expiresInMinutes: Math.round(CODE_TTL_MS / 60000) };
};

export const verifyOpsStepUpCode = (userId, code) => {
  const key = String(userId || '');
  const entry = activeCodes.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    activeCodes.delete(key);
    return { ok: false, error: 'OPS_STEP_UP_CODE_EXPIRED' };
  }
  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    activeCodes.delete(key);
    return { ok: false, error: 'OPS_STEP_UP_TOO_MANY_ATTEMPTS' };
  }
  entry.attempts += 1;
  if (!verifyCodeHash(code, entry.codeHash)) {
    return { ok: false, error: 'OPS_STEP_UP_CODE_INVALID' };
  }
  activeCodes.delete(key);
  return { ok: true };
};
