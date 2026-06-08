import { getClientIp } from '../utils/loginContext.js';
import { sendSecurityAlert } from './alerts.js';
import {
  clearSecurityCounter,
  incrementSecurityCounter,
  readSecurityCounter,
} from './securityStore.js';
import { getTurnstileConfig } from './turnstileConfig.js';

export const LOGIN_FAILURE_ALERT_THRESHOLD = 3;

const normalizeEmailKey = (email) => String(email || '').toLowerCase().trim();

export const recordLoginFailure = async ({ email, ip }) => {
  const emailCount = await incrementSecurityCounter('email', normalizeEmailKey(email));
  const ipCount = await incrementSecurityCounter('ip', ip || '');

  if (emailCount >= LOGIN_FAILURE_ALERT_THRESHOLD || ipCount >= LOGIN_FAILURE_ALERT_THRESHOLD) {
    void sendSecurityAlert({
      type: 'LOGIN_FAILURE_SPIKE',
      details: {
        emailCount,
        ipCount,
        path: '/api/auth/login',
      },
    });
  }

  return {
    emailCount,
    ipCount,
    thresholdReached: emailCount >= LOGIN_FAILURE_ALERT_THRESHOLD,
  };
};

export const clearLoginFailures = async (email) => {
  await clearSecurityCounter('email', normalizeEmailKey(email));
};

export const shouldRequireTurnstileForLogin = async (req, email) => {
  const config = getTurnstileConfig();
  if (!config.enabled) return false;
  if (config.enforceLogin) return true;
  if (process.env.TURNSTILE_RISKY_LOGIN !== 'true') return false;

  const threshold = config.riskyLoginThreshold;
  const emailCount = await readSecurityCounter('email', normalizeEmailKey(email));
  const ipCount = await readSecurityCounter('ip', getClientIp(req));
  return emailCount >= threshold || ipCount >= threshold;
};

export const __testOnlyResetLoginRiskTrackers = async () => {
  const { __testOnlyResetSecurityStore } = await import('./securityStore.js');
  __testOnlyResetSecurityStore();
};
