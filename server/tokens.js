import jwt from 'jsonwebtoken';

const required = (key, fallback = null) => {
  const value = process.env[key] || fallback;
  if (!value) throw new Error(`${key}_MISSING`);
  return value;
};

const JWT_SECRET = () => {
  const value = required('JWT_SECRET');
  if (process.env.NODE_ENV === 'production' && String(value).length < 64) {
    throw new Error('JWT_SECRET_TOO_SHORT');
  }
  return value;
};
const ACCESS_EXPIRES = () => required('ACCESS_TOKEN_EXPIRES_IN', '15m');
const REFRESH_EXPIRES = () => required('REFRESH_TOKEN_EXPIRES_IN', '7d');

const issueMfaPendingToken = (user) => jwt.sign({
  sub: user.id,
  role: user.role,
  email: user.email,
  typ: 'mfa_pending',
}, JWT_SECRET(), { expiresIn: '10m' });

const issueAccessToken = (user) => jwt.sign({
  sub: user.id,
  role: user.role,
  email: user.email,
  typ: 'access',
}, JWT_SECRET(), { expiresIn: ACCESS_EXPIRES() });

const issueRefreshToken = (user) => jwt.sign({
  sub: user.id,
  role: user.role,
  email: user.email,
  typ: 'refresh',
}, JWT_SECRET(), { expiresIn: REFRESH_EXPIRES() });

const issueOpsStepUpToken = (user) => jwt.sign({
  sub: user.id,
  role: user.role,
  email: user.email,
  typ: 'ops_step_up',
}, JWT_SECRET(), { expiresIn: '15m' });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET());

export {
  issueAccessToken,
  issueMfaPendingToken,
  issueOpsStepUpToken,
  issueRefreshToken,
  verifyToken,
};
