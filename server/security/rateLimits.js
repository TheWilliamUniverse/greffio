import rateLimit from 'express-rate-limit';
import { getClientIp } from '../utils/loginContext.js';
import { logStructured } from '../utils/structuredLog.js';
import { sendSecurityAlert } from './alerts.js';
import { recordSecurityMetric } from './metrics.js';

export const SOBER_RATE_LIMIT_MESSAGE = 'Trop de tentatives. Réessayez dans quelques minutes.';

let rateLimitHitCounter = 0;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

export const createSoberRateLimitHandler = (signal = 'RATE_LIMIT_HIT') => (req, res, _next, options) => {
  logStructured.warn(signal, {
    path: req.path,
    method: req.method,
    ip: getClientIp(req),
  });
  recordSecurityMetric('rate_limit_429');
  rateLimitHitCounter += 1;
  if (rateLimitHitCounter % 25 === 0) {
    void sendSecurityAlert({
      type: signal,
      details: { path: req.path, method: req.method, hits: rateLimitHitCounter },
    });
  }
  res.status(options.statusCode || 429).json({
    ok: false,
    error: 'RATE_LIMITED',
    message: SOBER_RATE_LIMIT_MESSAGE,
  });
};

const baseLimiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: createSoberRateLimitHandler(),
};

export const createSpecializedRateLimiter = ({ windowMs, max, signal }) => rateLimit({
  ...baseLimiterOptions,
  windowMs,
  max,
  handler: createSoberRateLimitHandler(signal),
});

export const authLimiter = createSpecializedRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  signal: 'AUTH_RATE_LIMIT_HIT',
});

export const authRefreshLimiter = createSpecializedRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  signal: 'AUTH_REFRESH_RATE_LIMIT_HIT',
});

export const paymentLimiter = createSpecializedRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 40,
  signal: 'PAYMENT_RATE_LIMIT_HIT',
});

export const uploadLimiter = createSpecializedRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  signal: 'UPLOAD_RATE_LIMIT_HIT',
});

export const companyLookupPublicLimiter = createSpecializedRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  signal: 'COMPANY_LOOKUP_RATE_LIMIT_HIT',
});

export const statutesPreviewDraftLimiter = createSpecializedRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  signal: 'STATUTES_PREVIEW_RATE_LIMIT_HIT',
});

export const assistantLimiter = createSpecializedRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 60,
  signal: 'ASSISTANT_RATE_LIMIT_HIT',
});

export const contactLimiter = createSpecializedRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  signal: 'CONTACT_RATE_LIMIT_HIT',
});

export const credentialsUnlockLimiter = createSpecializedRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  signal: 'CREDENTIALS_UNLOCK_RATE_LIMIT_HIT',
});

export const opsStepUpLimiter = createSpecializedRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  signal: 'OPS_STEP_UP_RATE_LIMIT_HIT',
});

export const appDownloadAccessLimiter = createSpecializedRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  signal: 'APP_DOWNLOAD_ACCESS_RATE_LIMIT_HIT',
});

export const healthRateLimiter = createSpecializedRateLimiter({
  windowMs: 60 * 1000,
  max: parsePositiveInt(process.env.HEALTH_RATE_LIMIT_MAX, 60),
  signal: 'HEALTH_RATE_LIMIT_HIT',
});

export const createGlobalApiRateLimiter = () => rateLimit({
  ...baseLimiterOptions,
  windowMs: parsePositiveInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: parsePositiveInt(
    process.env.GLOBAL_RATE_LIMIT_MAX,
    process.env.NODE_ENV === 'production' ? 300 : 2000,
  ),
  handler: createSoberRateLimitHandler('GLOBAL_RATE_LIMIT_HIT'),
  skip: (req) => {
    const path = req.path || '';
    return path.startsWith('/webhooks/') || path.startsWith('/callback');
  },
});

const STRICT_PUBLIC_PATH_PREFIXES = [
  '/api/contact/',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/company-search',
  '/api/public/company-search',
];

export const isStrictPublicPath = (path = '') => STRICT_PUBLIC_PATH_PREFIXES.some(
  (prefix) => path === prefix || path.startsWith(prefix),
);

export const createStrictPublicRateLimiter = () => rateLimit({
  ...baseLimiterOptions,
  windowMs: 60 * 1000,
  max: parsePositiveInt(process.env.STRICT_PUBLIC_RATE_LIMIT_MAX, 40),
  handler: createSoberRateLimitHandler('STRICT_PUBLIC_RATE_LIMIT_HIT'),
  skip: (req) => !isStrictPublicPath(req.path),
});

export const strictPublicRateLimitMiddleware = (limiter) => (req, res, next) => {
  if (!isStrictPublicPath(req.path)) return next();
  return limiter(req, res, next);
};
