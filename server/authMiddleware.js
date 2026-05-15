import { verifyToken } from './tokens.js';

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
    req.auth = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'AUTH_TOKEN_INVALID' });
  }
};

const requireRole = (roles = []) => (req, res, next) => {
  if (!req.auth?.role) return res.status(403).json({ ok: false, error: 'ROLE_MISSING' });
  if (!roles.includes(req.auth.role)) return res.status(403).json({ ok: false, error: 'ROLE_FORBIDDEN' });
  return next();
};

export {
  requireAuth,
  requireRole,
};
