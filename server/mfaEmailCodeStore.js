import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const MFA_EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const MFA_EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;
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

export const maskEmailAddress = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
};

export const getMfaEmailCodeState = (userId) => {
  const entry = activeCodes.get(String(userId || ''));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    activeCodes.delete(String(userId));
    return null;
  }
  return entry;
};

export const canSendMfaEmailCode = (userId) => {
  const entry = getMfaEmailCodeState(userId);
  if (!entry) return { ok: true, retryAfterSeconds: 0 };
  const elapsed = Date.now() - entry.lastSentAt;
  if (elapsed >= MFA_EMAIL_RESEND_COOLDOWN_MS) return { ok: true, retryAfterSeconds: 0 };
  return {
    ok: false,
    retryAfterSeconds: Math.ceil((MFA_EMAIL_RESEND_COOLDOWN_MS - elapsed) / 1000),
  };
};

export const issueMfaEmailCode = (userId) => {
  const key = String(userId || '');
  const sendCheck = canSendMfaEmailCode(userId);
  if (!sendCheck.ok) {
    const error = new Error('MFA_EMAIL_COOLDOWN');
    error.retryAfterSeconds = sendCheck.retryAfterSeconds;
    throw error;
  }

  const code = generateCode();
  const now = Date.now();
  activeCodes.set(key, {
    codeHash: hashCode(code),
    expiresAt: now + MFA_EMAIL_CODE_TTL_MS,
    lastSentAt: now,
    attempts: 0,
  });

  return {
    code,
    expiresInMinutes: Math.round(MFA_EMAIL_CODE_TTL_MS / 60000),
  };
};

export const verifyMfaEmailCode = ({ userId, code }) => {
  const key = String(userId || '');
  const entry = getMfaEmailCodeState(userId);
  if (!entry) return false;

  entry.attempts += 1;
  if (entry.attempts > MAX_VERIFY_ATTEMPTS) {
    activeCodes.delete(key);
    return false;
  }

  const valid = verifyCodeHash(code, entry.codeHash);
  if (valid) {
    activeCodes.delete(key);
    return true;
  }
  return false;
};

export const clearMfaEmailCode = (userId) => {
  activeCodes.delete(String(userId || ''));
};
