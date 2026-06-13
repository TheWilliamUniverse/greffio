import { createHash, randomBytes, randomInt } from 'node:crypto';

const CODE_TTL_MS = 15 * 60 * 1000;
const ACCESS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 8;

let activeCode = null;
const accessSessions = new Map();

const hashValue = (value) => createHash('sha256').update(String(value)).digest('hex');

const purgeExpired = () => {
  const now = Date.now();
  if (activeCode && activeCode.expiresAt <= now) {
    activeCode = null;
  }
  for (const [token, session] of accessSessions.entries()) {
    if (session.expiresAt <= now) {
      accessSessions.delete(token);
    }
  }
};

export const generateAccessCode = () => {
  purgeExpired();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  activeCode = {
    hash: hashValue(code),
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
    sentAt: Date.now(),
  };
  return code;
};

export const verifyAccessCode = (submittedCode) => {
  purgeExpired();
  const normalized = String(submittedCode || '').trim();
  if (!/^\d{6}$/.test(normalized)) {
    return { ok: false, error: 'APP_DOWNLOAD_CODE_INVALID' };
  }

  const adminCode = String(process.env.ADMIN_APP_DOWNLOAD_CODE || '').trim();
  if (adminCode && normalized === adminCode) {
    return createAccessSession();
  }

  if (!activeCode || activeCode.expiresAt <= Date.now()) {
    return { ok: false, error: 'APP_DOWNLOAD_CODE_EXPIRED' };
  }

  activeCode.attempts += 1;
  if (activeCode.attempts > MAX_VERIFY_ATTEMPTS) {
    activeCode = null;
    return { ok: false, error: 'APP_DOWNLOAD_CODE_LOCKED' };
  }

  if (hashValue(normalized) !== activeCode.hash) {
    return { ok: false, error: 'APP_DOWNLOAD_CODE_INVALID' };
  }

  activeCode = null;
  return createAccessSession();
};

const createAccessSession = () => {
  const token = randomBytes(24).toString('hex');
  const expiresAt = Date.now() + ACCESS_TTL_MS;
  accessSessions.set(token, { expiresAt });
  return {
    ok: true,
    accessToken: token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
};

export const isAccessTokenValid = (token) => {
  purgeExpired();
  const session = accessSessions.get(String(token || '').trim());
  if (!session || session.expiresAt <= Date.now()) {
    return false;
  }
  return true;
};

export const getCodeRecipientEmail = () => {
  const fromEnv = String(process.env.APP_DOWNLOAD_CODE_RECIPIENT || '').trim().toLowerCase();
  return fromEnv || 'ibtissam@willentreprises.com';
};
