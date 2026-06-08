import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveActiveCaptchaProvider } from './captchaVerify.js';
import {
  __testOnlyResetVerificationBudget,
  isVerificationBudgetExhausted,
  spendVerificationBudget,
  VERIFICATION_BUDGET,
} from './verificationBudget.js';
import { __testOnlyResetCaptchaFallbackState, recordTurnstileProviderFailure } from './captchaFallbackState.js';

test('budget bloque les appels externes quand le plafond horaire est atteint', () => {
  const previous = { ...process.env };
  process.env.CAPTCHA_VERIFY_HOURLY_MAX = '2';
  process.env.TURNSTILE_VERIFY_HOURLY_MAX = '2';
  __testOnlyResetVerificationBudget();

  spendVerificationBudget('turnstile');
  spendVerificationBudget('turnstile');
  assert.equal(isVerificationBudgetExhausted('turnstile'), true);

  process.env = previous;
  __testOnlyResetVerificationBudget();
});

test('recaptcha primaire quand turnstile desactive', () => {
  const previous = { ...process.env };
  delete process.env.TURNSTILE_ENABLED;
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SITE_KEY;
  process.env.RECAPTCHA_FALLBACK_ENABLED = 'true';
  process.env.RECAPTCHA_SECRET_KEY = 'recaptcha-secret';
  process.env.RECAPTCHA_SITE_KEY = 'recaptcha-site';
  __testOnlyResetVerificationBudget();
  assert.equal(resolveActiveCaptchaProvider(), 'recaptcha');
  process.env = previous;
  __testOnlyResetVerificationBudget();
});

test('fallback recaptcha actif quand turnstile degrade', () => {
  const previous = { ...process.env };
  process.env.TURNSTILE_ENABLED = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  process.env.TURNSTILE_SITE_KEY = 'site';
  process.env.RECAPTCHA_FALLBACK_ENABLED = 'true';
  process.env.RECAPTCHA_SECRET_KEY = 'recaptcha-secret';
  process.env.RECAPTCHA_SITE_KEY = 'recaptcha-site';
  __testOnlyResetCaptchaFallbackState();
  __testOnlyResetVerificationBudget();

  recordTurnstileProviderFailure();
  recordTurnstileProviderFailure();
  recordTurnstileProviderFailure();

  assert.equal(resolveActiveCaptchaProvider(), 'recaptcha');

  process.env = previous;
  __testOnlyResetCaptchaFallbackState();
  __testOnlyResetVerificationBudget();
});

test('plafonds assistant documentés et conservateurs', () => {
  assert.ok(VERIFICATION_BUDGET.dailyAssistant() <= 500);
  assert.ok(VERIFICATION_BUDGET.hourlyAssistant() <= 100);
});
