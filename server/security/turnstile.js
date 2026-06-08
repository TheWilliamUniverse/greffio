import { logStructured } from '../utils/structuredLog.js';
import { getTurnstileConfig } from './turnstileConfig.js';
import {
  canSpendVerificationBudget,
  spendVerificationBudget,
} from './verificationBudget.js';

export const SECURITY_CHECK_MESSAGE = 'Nous n\'avons pas pu vérifier cette action. Merci de réessayer.';

export { getTurnstileConfig };

export const verifyTurnstileToken = async ({ token, remoteIp, expectedAction }) => {
  const config = getTurnstileConfig();
  if (!config.enabled) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: 'MISSING_TOKEN' };
  if (!config.secretKey) return { ok: false, reason: 'NOT_CONFIGURED' };
  if (!canSpendVerificationBudget('turnstile')) {
    return { ok: false, reason: 'BUDGET_EXCEEDED' };
  }

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
    spendVerificationBudget('turnstile');
    return { ok: true, provider: 'turnstile' };
  } catch (error) {
    logStructured.warn('TURNSTILE_VERIFY_FAILED', {
      reason: error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK',
    });
    return { ok: false, reason: 'SERVICE_UNAVAILABLE' };
  }
};

export { createCaptchaMiddleware as createTurnstileMiddleware } from './captchaVerify.js';
