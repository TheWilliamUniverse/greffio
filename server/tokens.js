import jwt from 'jsonwebtoken';

const required = (key, fallback = null) => {
  const value = process.env[key] || fallback;
  if (!value) throw new Error(`${key}_MISSING`);
  return value;
};

const JWT_SECRET = () => required('JWT_SECRET', 'dev_jwt_secret_change_me_64_chars_minimum');
const ACCESS_EXPIRES = () => required('ACCESS_TOKEN_EXPIRES_IN', '15m');
const REFRESH_EXPIRES = () => required('REFRESH_TOKEN_EXPIRES_IN', '7d');

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

const verifyToken = (token) => jwt.verify(token, JWT_SECRET());

export {
  issueAccessToken,
  issueRefreshToken,
  verifyToken,
};
