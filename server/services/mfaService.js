import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

const deriveEncryptionKeyFromMaterial = (secretMaterial) => {
  const secret = String(secretMaterial || '').trim();
  if (!secret) return null;
  return scryptSync(secret, 'greffio-mfa-v1', 32);
};

const LEGACY_BASE32_PATTERN = /^[A-Z2-7]+=*$/i;

const collectEncryptionKeyMaterials = () => {
  const candidates = [
    process.env.MFA_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    process.env.NODE_ENV !== 'production' ? 'greffio-dev-mfa-key' : null,
  ];
  return [...new Set(candidates.map((value) => String(value || '').trim()).filter(Boolean))];
};

const tryDecryptPayload = (payload, secretMaterial) => {
  const key = deriveEncryptionKeyFromMaterial(secretMaterial);
  if (!key) return null;
  const [ivB64, tagB64, dataB64] = String(payload).split(':');
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (_error) {
    return null;
  }
};

const encryptSecret = (plaintext) => {
  const keyMaterial = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'greffio-dev-mfa-key';
  const key = deriveEncryptionKeyFromMaterial(keyMaterial);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

const decryptSecret = (payload) => {
  if (!payload) return null;
  const raw = String(payload).trim();
  if (!raw) return null;

  if (!raw.includes(':')) {
    const compact = raw.replace(/\s+/g, '').toUpperCase();
    if (LEGACY_BASE32_PATTERN.test(compact)) return compact;
    return null;
  }

  for (const keyMaterial of collectEncryptionKeyMaterials()) {
    const decrypted = tryDecryptPayload(raw, keyMaterial);
    if (decrypted) return decrypted;
  }
  return null;
};

const hashRecoveryCode = (code) => {
  const normalized = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(normalized, salt, 32).toString('hex');
  return `${salt}:${hash}`;
};

const verifyRecoveryCode = (code, storedHash) => {
  const normalized = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const supplied = scryptSync(normalized, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
};

const generateRecoveryCodes = (count = 8) => {
  const codes = [];
  for (let index = 0; index < count; index += 1) {
    const partA = randomBytes(2).toString('hex').toUpperCase();
    const partB = randomBytes(2).toString('hex').toUpperCase();
    codes.push(`GRF-${partA}-${partB}`);
  }
  return codes;
};

const buildTotpSetup = async ({ email }) => {
  const secret = generateSecret();
  const labelEmail = String(email || '').trim().toLowerCase();
  const otpauthUrl = generateURI({
    issuer: 'Greffio',
    label: labelEmail,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 1,
    width: 220,
    color: { dark: '#214082', light: '#FFFFFF' },
  });
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
    encryptedSecret: encryptSecret(secret),
  };
};

const verifyTotpCode = ({ secret, token }) => {
  const normalized = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized) || !secret) return false;
  try {
    const result = verifySync({
      token: normalized,
      secret: String(secret).replace(/\s+/g, '').toUpperCase(),
      epochTolerance: 90,
    });
    return Boolean(result?.valid);
  } catch (_error) {
    return false;
  }
};

const normalizeRecoveryCode = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');

export {
  buildTotpSetup,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyRecoveryCode,
  verifyTotpCode,
};
