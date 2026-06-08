import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SOBER_RATE_LIMIT_MESSAGE,
  createSoberRateLimitHandler,
  isStrictPublicPath,
} from './rateLimits.js';
import {
  __testOnlyResetLoginRiskTrackers,
  recordLoginFailure,
  shouldRequireTurnstileForLogin,
} from './loginRisk.js';
import { getTurnstileConfig } from './turnstileConfig.js';

test('isStrictPublicPath couvre les routes publiques sensibles', () => {
  assert.equal(isStrictPublicPath('/api/auth/login'), true);
  assert.equal(isStrictPublicPath('/api/contact/appointment-request'), true);
  assert.equal(isStrictPublicPath('/api/dossiers/abc'), false);
});

test('handler rate limit renvoie un message sobre', () => {
  const handler = createSoberRateLimitHandler('TEST_RATE_LIMIT');
  const body = {};
  const res = {
    statusCode: 0,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      Object.assign(body, payload);
      return this;
    },
  };
  handler({ path: '/api/auth/login', method: 'POST' }, res, () => {}, { statusCode: 429 });
  assert.equal(res.statusCode, 429);
  assert.equal(body.error, 'RATE_LIMITED');
  assert.equal(body.message, SOBER_RATE_LIMIT_MESSAGE);
});

test('login risky active Turnstile après seuil email', async () => {
  const previous = { ...process.env };
  process.env.TURNSTILE_ENABLED = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  process.env.TURNSTILE_RISKY_LOGIN = 'true';
  process.env.TURNSTILE_LOGIN_RISKY_THRESHOLD = '2';
  process.env.TURNSTILE_ENFORCE_LOGIN = 'false';
  process.env.SECURITY_STORE = 'memory';

  await __testOnlyResetLoginRiskTrackers();
  const req = { headers: {}, socket: { remoteAddress: '203.0.113.10' } };

  await recordLoginFailure({ email: 'client@example.com', ip: '203.0.113.10' });
  assert.equal(await shouldRequireTurnstileForLogin(req, 'client@example.com'), false);

  await recordLoginFailure({ email: 'client@example.com', ip: '203.0.113.10' });
  assert.equal(await shouldRequireTurnstileForLogin(req, 'client@example.com'), true);

  process.env = previous;
});

test('Turnstile désactivé par défaut sans variables', () => {
  const previous = { ...process.env };
  delete process.env.TURNSTILE_ENABLED;
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(getTurnstileConfig().enabled, false);
  process.env = previous;
});
