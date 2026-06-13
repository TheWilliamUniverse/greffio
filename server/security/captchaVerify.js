import { getClientIp } from '../utils/loginContext.js';
import { logStructured } from '../utils/structuredLog.js';
import { shouldRequireTurnstileForLogin } from './loginRisk.js';
import { getTurnstileConfig, SECURITY_CHECK_MESSAGE, verifyTurnstileToken } from './turnstile.js';
import { getRecaptchaConfig } from './recaptchaConfig.js';
import { verifyRecaptchaToken, isRecaptchaFallbackAvailable } from './recaptcha.js';
import {
  isTurnstileDegraded,
  recordTurnstileProviderFailure,
} from './captchaFallbackState.js';
import {
  canSpendVerificationBudget,
  isVerificationBudgetExhausted,
} from './verificationBudget.js';
import { SOBER_RATE_LIMIT_MESSAGE } from './rateLimits.js';

const isEnforcedForAction = (config, action) => {
  if (action === 'login') return config.enforceLogin;
  if (action === 'signup') return config.enforceSignup;
  if (action === 'contact') return config.enforceContact;
  if (action === 'forgot_password') return config.enforceForgotPassword;
  if (action === 'reset_password') return config.enforceResetPassword;
  return false;
};

export const resolveActiveCaptchaProvider = () => {
  const turnstile = getTurnstileConfig();
  const recaptcha = getRecaptchaConfig();
  const turnstileReady = turnstile.enabled && Boolean(process.env.TURNSTILE_SITE_KEY);
  const recaptchaReady = recaptcha.enabled && Boolean(recaptcha.siteKey);

  if (!turnstileReady) {
    if (recaptchaReady && isRecaptchaFallbackAvailable()) {
      return 'recaptcha';
    }
    return 'none';
  }

  const turnstileBudgetOk = canSpendVerificationBudget('turnstile');
  const recaptchaFallbackTriggered = recaptchaReady
    && (isTurnstileDegraded() || !turnstileBudgetOk || isVerificationBudgetExhausted('turnstile'));

  if (recaptchaFallbackTriggered && isRecaptchaFallbackAvailable()) {
    return 'recaptcha';
  }
  if (turnstileBudgetOk) {
    return 'turnstile';
  }
  return 'none';
};

export const verifyCaptchaTokens = async ({
  turnstileToken,
  recaptchaToken,
  remoteIp,
  expectedAction,
}) => {
  const provider = resolveActiveCaptchaProvider();

  if (provider === 'recaptcha' && recaptchaToken) {
    return verifyRecaptchaToken({ token: recaptchaToken, remoteIp });
  }

  if (turnstileToken) {
    const result = await verifyTurnstileToken({
      token: turnstileToken,
      remoteIp,
      expectedAction,
    });
    if (result.ok) return result;
    if (['SERVICE_UNAVAILABLE', 'VERIFICATION_FAILED'].includes(result.reason)) {
      recordTurnstileProviderFailure();
    }
    if (isRecaptchaFallbackAvailable() && recaptchaToken) {
      return verifyRecaptchaToken({ token: recaptchaToken, remoteIp });
    }
    return result;
  }

  if (recaptchaToken && isRecaptchaFallbackAvailable()) {
    return verifyRecaptchaToken({ token: recaptchaToken, remoteIp });
  }

  return { ok: false, reason: 'MISSING_TOKEN' };
};

import { isTrustedNativeClient } from './nativeClient.js';

export const createCaptchaMiddleware = (action, options = {}) => {
  const { mode = 'enforce' } = options;

  return async (req, res, next) => {
    if (isTrustedNativeClient(req) && (action === 'login' || action === 'signup')) {
      return next();
    }

    const turnstileConfig = getTurnstileConfig();
    const recaptchaConfig = getRecaptchaConfig();
    const protectionEnabled = turnstileConfig.enabled || recaptchaConfig.enabled;
    if (!protectionEnabled) return next();

    let required = false;
    if (mode === 'risky-only' && action === 'login') {
      required = await shouldRequireTurnstileForLogin(req, req.body?.email);
    } else {
      required = isEnforcedForAction(turnstileConfig, action);
    }

    if (!required) return next();

    if (isVerificationBudgetExhausted('total')) {
      return res.status(429).json({
        ok: false,
        error: 'RATE_LIMITED',
        message: SOBER_RATE_LIMIT_MESSAGE,
      });
    }

    const turnstileToken = req.body?.turnstileToken || req.headers['x-turnstile-token'];
    const recaptchaToken = req.body?.recaptchaToken || req.headers['x-recaptcha-token'];
    const verification = await verifyCaptchaTokens({
      turnstileToken,
      recaptchaToken,
      remoteIp: getClientIp(req),
      expectedAction: action,
    });

    if (verification.ok) return next();

    if (verification.reason === 'BUDGET_EXCEEDED') {
      return res.status(429).json({
        ok: false,
        error: 'RATE_LIMITED',
        message: SOBER_RATE_LIMIT_MESSAGE,
      });
    }

    if (turnstileConfig.failOpen) {
      logStructured.warn('CAPTCHA_FAIL_OPEN', { action, reason: verification.reason });
      return next();
    }

    return res.status(400).json({
      ok: false,
      error: 'SECURITY_CHECK_REQUIRED',
      message: SECURITY_CHECK_MESSAGE,
      captchaProvider: resolveActiveCaptchaProvider(),
    });
  };
};
