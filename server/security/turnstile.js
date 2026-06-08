import { getClientIp } from '../utils/loginContext.js';
import { logStructured } from '../utils/structuredLog.js';
import { shouldRequireTurnstileForLogin } from './loginRisk.js';
import { getTurnstileConfig } from './turnstileConfig.js';

export const SECURITY_CHECK_MESSAGE = 'Nous n\'avons pas pu vérifier cette action. Merci de réessayer.';

export { getTurnstileConfig };

const isEnforcedForAction = (config, action) => {
  if (action === 'login') return config.enforceLogin;
  if (action === 'signup') return config.enforceSignup;
  if (action === 'contact') return config.enforceContact;
  if (action === 'forgot_password') return config.enforceForgotPassword;
  if (action === 'reset_password') return config.enforceResetPassword;
  return false;
};

export const verifyTurnstileToken = async ({ token, remoteIp, expectedAction }) => {
  const config = getTurnstileConfig();
  if (!config.enabled) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: 'MISSING_TOKEN' };
  if (!config.secretKey) return { ok: false, reason: 'NOT_CONFIGURED' };

  try {
    const body = new URLSearchParams({
      secret: config.secretKey,
      response: String(token),
      remoteip: remoteIp || '',
    });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    if (!data?.success) {
      return { ok: false, reason: 'VERIFICATION_FAILED' };
    }
    if (expectedAction && data.action && data.action !== expectedAction) {
      return { ok: false, reason: 'ACTION_MISMATCH' };
    }
    return { ok: true };
  } catch (error) {
    logStructured.warn('TURNSTILE_VERIFY_FAILED', {
      reason: error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK',
    });
    return { ok: false, reason: 'SERVICE_UNAVAILABLE' };
  }
};

export const createTurnstileMiddleware = (action, options = {}) => {
  const { mode = 'enforce' } = options;

  return async (req, res, next) => {
    const config = getTurnstileConfig();
    if (!config.enabled) return next();

    let required = false;
    if (mode === 'risky-only' && action === 'login') {
      required = await shouldRequireTurnstileForLogin(req, req.body?.email);
    } else {
      required = isEnforcedForAction(config, action);
    }

    if (!required) return next();

    const token = req.body?.turnstileToken || req.headers['x-turnstile-token'];
    const verification = await verifyTurnstileToken({
      token,
      remoteIp: getClientIp(req),
      expectedAction: action,
    });

    if (verification.ok) return next();

    if (config.failOpen) {
      logStructured.warn('TURNSTILE_FAIL_OPEN', { action, reason: verification.reason });
      return next();
    }

    return res.status(400).json({
      ok: false,
      error: 'SECURITY_CHECK_REQUIRED',
      message: SECURITY_CHECK_MESSAGE,
    });
  };
};
