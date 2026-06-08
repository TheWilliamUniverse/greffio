import { logStructured } from '../utils/structuredLog.js';
import { sendSecurityAlert } from './alerts.js';

const HOURLY_WINDOW_MS = 60 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

const buckets = new Map();

const parseCap = (name, fallback) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

export const VERIFICATION_BUDGET = {
  hourlyTotal: () => parseCap('CAPTCHA_VERIFY_HOURLY_MAX', 400),
  dailyTotal: () => parseCap('CAPTCHA_VERIFY_DAILY_MAX', 3000),
  hourlyTurnstile: () => parseCap('TURNSTILE_VERIFY_HOURLY_MAX', 350),
  hourlyRecaptcha: () => parseCap('RECAPTCHA_VERIFY_HOURLY_MAX', 120),
  hourlyAssistant: () => parseCap('ASSISTANT_HOURLY_MAX', 80),
  dailyAssistant: () => parseCap('ASSISTANT_DAILY_MAX', 400),
};

const getBucket = (key, windowMs) => {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.startedAt > windowMs) {
    const next = { count: 0, startedAt: now };
    buckets.set(key, next);
    return next;
  }
  return existing;
};

const isExhausted = (key, windowMs, max) => getBucket(key, windowMs).count >= max;

export const isVerificationBudgetExhausted = (provider = 'total') => {
  if (provider === 'turnstile') {
    return isExhausted('turnstile:hour', HOURLY_WINDOW_MS, VERIFICATION_BUDGET.hourlyTurnstile())
      || isExhausted('total:hour', HOURLY_WINDOW_MS, VERIFICATION_BUDGET.hourlyTotal())
      || isExhausted('total:day', DAILY_WINDOW_MS, VERIFICATION_BUDGET.dailyTotal());
  }
  if (provider === 'recaptcha') {
    return isExhausted('recaptcha:hour', HOURLY_WINDOW_MS, VERIFICATION_BUDGET.hourlyRecaptcha())
      || isExhausted('total:hour', HOURLY_WINDOW_MS, VERIFICATION_BUDGET.hourlyTotal())
      || isExhausted('total:day', DAILY_WINDOW_MS, VERIFICATION_BUDGET.dailyTotal());
  }
  return isExhausted('total:hour', HOURLY_WINDOW_MS, VERIFICATION_BUDGET.hourlyTotal())
    || isExhausted('total:day', DAILY_WINDOW_MS, VERIFICATION_BUDGET.dailyTotal());
};

export const spendVerificationBudget = (provider) => {
  const bucketKeys = ['total:hour', 'total:day'];
  if (provider === 'turnstile') bucketKeys.push('turnstile:hour');
  if (provider === 'recaptcha') bucketKeys.push('recaptcha:hour');

  bucketKeys.forEach((key) => {
    const windowMs = key.endsWith(':day') ? DAILY_WINDOW_MS : HOURLY_WINDOW_MS;
    const bucket = getBucket(key, windowMs);
    bucket.count += 1;
  });

  const hourlyTotal = getBucket('total:hour', HOURLY_WINDOW_MS).count;
  const caps = VERIFICATION_BUDGET;
  if (hourlyTotal === caps.hourlyTotal() || getBucket('total:day', DAILY_WINDOW_MS).count === caps.dailyTotal()) {
    logStructured.warn('CAPTCHA_VERIFY_BUDGET_REACHED', { provider, hourlyTotal });
    void sendSecurityAlert({
      type: 'CAPTCHA_VERIFY_BUDGET_REACHED',
      details: { provider, hourlyTotal },
    });
  }
};

export const canSpendVerificationBudget = (provider) => !isVerificationBudgetExhausted(provider);

export const isAssistantBudgetExhausted = () => (
  isExhausted('assistant:hour', HOURLY_WINDOW_MS, VERIFICATION_BUDGET.hourlyAssistant())
  || isExhausted('assistant:day', DAILY_WINDOW_MS, VERIFICATION_BUDGET.dailyAssistant())
);

export const spendAssistantBudget = () => {
  getBucket('assistant:hour', HOURLY_WINDOW_MS).count += 1;
  getBucket('assistant:day', DAILY_WINDOW_MS).count += 1;
};

export const __testOnlyResetVerificationBudget = () => {
  buckets.clear();
};
