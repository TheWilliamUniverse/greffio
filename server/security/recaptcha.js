import { logStructured } from '../utils/structuredLog.js';
import {
  canSpendVerificationBudget,
  isVerificationBudgetExhausted,
  spendVerificationBudget,
} from './verificationBudget.js';
import { getRecaptchaConfig } from './recaptchaConfig.js';

export const verifyRecaptchaToken = async ({ token, remoteIp }) => {
  const config = getRecaptchaConfig();
  if (!config.enabled) return { ok: false, reason: 'NOT_CONFIGURED' };
  if (!token) return { ok: false, reason: 'MISSING_TOKEN' };

  if (!canSpendVerificationBudget('recaptcha')) {
    return { ok: false, reason: 'BUDGET_EXCEEDED' };
  }

  try {
    const body = new URLSearchParams({
      secret: config.secretKey,
      response: String(token),
      remoteip: remoteIp || '',
    });
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json();
    if (!data?.success) {
      return { ok: false, reason: 'VERIFICATION_FAILED' };
    }
    spendVerificationBudget('recaptcha');
    return { ok: true, provider: 'recaptcha' };
  } catch (error) {
    logStructured.warn('RECAPTCHA_VERIFY_FAILED', {
      reason: error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK',
    });
    return { ok: false, reason: 'SERVICE_UNAVAILABLE' };
  }
};

export const isRecaptchaFallbackAvailable = () => {
  const config = getRecaptchaConfig();
  return config.enabled
    && Boolean(config.siteKey)
    && !isVerificationBudgetExhausted('recaptcha');
};
