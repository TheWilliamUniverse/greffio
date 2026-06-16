import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const generateSignatureProofId = () => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `GRF-SIG-${stamp}-${suffix}`;
};

export const hashPdfFile = (filePath, fs) => {
  const bytes = fs.readFileSync(filePath);
  return createHash('sha256').update(bytes).digest('hex');
};

export const hashPdfBytes = (bytes) => createHash('sha256').update(bytes).digest('hex');

export const maskEmail = (email) => {
  const raw = String(email || '').trim();
  const [local, domain] = raw.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
};

export const maskIpAddress = (ip) => {
  const raw = String(ip || '');
  if (!raw.includes('.')) return raw ? `${raw.slice(0, 8)}…` : '';
  const parts = raw.split('.');
  return `${parts[0]}.${parts[1]}.***.***`;
};

export const buildGreffioProofLine = ({ proofId, signedAtIso }) => {
  const label = new Date(signedAtIso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  return `Greffio – signature électronique simple renforcée – Preuve ${proofId} – Signé le ${label}`;
};

export const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const hashOtp = (code) => createHash('sha256').update(String(code || '')).digest('hex');

export const verifyOtpHash = (code, hash) => hashOtp(code) === hash;

export const newAuditEventId = () => randomUUID();
