import { verifyToken } from './tokens.js';
import { isInternalRole, normalizeRole } from './authRoles.js';

const readBearerToken = (headerValue) => {
  const [scheme, token] = String(headerValue || '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};

const requireAuth = (req, res, next) => {
  const token = readBearerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ ok: false, error: 'AUTH_TOKEN_MISSING' });
  try {
    const payload = verifyToken(token);
    if (payload.typ === 'mfa_pending') {
      return res.status(403).json({ ok: false, error: 'MFA_VERIFICATION_REQUIRED' });
    }
    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'AUTH_TOKEN_INVALID' });
  }
};

/** Bloque les tokens MFA intermédiaires sur les routes métier. */
const requireVerifiedAuth = (req, res, next) => {
  if (req.auth?.typ === 'mfa_pending') {
    return res.status(403).json({ ok: false, error: 'MFA_VERIFICATION_REQUIRED' });
  }
  return next();
};

const requireRole = (roles = []) => (req, res, next) => {
  const userRole = normalizeRole(req.auth?.role);
  if (!userRole) return res.status(403).json({ ok: false, error: 'ROLE_MISSING' });
  const allowed = roles.map((role) => normalizeRole(role));
  if (!allowed.includes(userRole)) return res.status(403).json({ ok: false, error: 'ROLE_FORBIDDEN' });
  return next();
};

export {
  requireAuth,
  requireVerifiedAuth,
  requireRole,
  isInternalRole,
};
