import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLoginAlertsProfilePatch,
  getLoginAlertsSettings,
  isLoginAlertEmailTemplate,
  isCriticalSecurityEmailTemplate,
  shouldSendLoginAlert,
} from './loginAlerts.js';

test('shouldSendLoginAlert returns false by default when preference is unset', () => {
  assert.equal(shouldSendLoginAlert({ profile: null }), false);
  assert.equal(shouldSendLoginAlert({ profile: { preferences: {} } }), false);
});

test('shouldSendLoginAlert returns false when user explicitly disabled alerts', () => {
  const user = {
    profile: {
      preferences: {
        security: {
          loginAlertsEnabled: false,
          loginAlertsEnabledUpdatedAt: '2026-05-24T10:00:00.000Z',
        },
      },
    },
  };
  assert.equal(shouldSendLoginAlert(user), false);
});

test('shouldSendLoginAlert returns true when user explicitly enabled alerts', () => {
  const user = {
    profile: {
      preferences: {
        security: {
          loginAlertsEnabled: true,
          loginAlertsEnabledUpdatedAt: '2026-05-24T10:00:00.000Z',
        },
      },
    },
  };
  assert.equal(shouldSendLoginAlert(user), true);
});

test('getLoginAlertsSettings exposes configured state and updatedAt', () => {
  const settings = getLoginAlertsSettings({
    profile: {
      preferences: {
        security: {
          loginAlertsEnabled: false,
          loginAlertsEnabledUpdatedAt: '2026-05-24T12:00:00.000Z',
        },
      },
    },
  });
  assert.equal(settings.configured, true);
  assert.equal(settings.enabled, false);
  assert.equal(settings.updatedAt, '2026-05-24T12:00:00.000Z');
});

test('buildLoginAlertsProfilePatch stores boolean and timestamp', () => {
  const patch = buildLoginAlertsProfilePatch(false);
  assert.equal(patch.preferences.security.loginAlertsEnabled, false);
  assert.match(patch.preferences.security.loginAlertsEnabledUpdatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('login alert templates are separated from critical security templates', () => {
  assert.equal(isLoginAlertEmailTemplate('login_notification'), true);
  assert.equal(isLoginAlertEmailTemplate('suspicious_login_attempt'), false);
  assert.equal(isCriticalSecurityEmailTemplate('suspicious_login_attempt'), true);
  assert.equal(isCriticalSecurityEmailTemplate('login_notification'), false);
});
