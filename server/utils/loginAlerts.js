/** Templates d’alerte de connexion informative (respectent loginAlertsEnabled). */
export const LOGIN_ALERT_EMAIL_TEMPLATES = new Set(['login_notification']);

/** Notifications de sécurité essentielles – jamais bloquées par loginAlertsEnabled. */
export const CRITICAL_SECURITY_EMAIL_TEMPLATES = new Set([
  'suspicious_login_attempt',
  'authentication_code',
  'password_reset',
  'password_reset_confirmation',
  'mfa_disabled',
  'email_verification',
]);

export const DEFAULT_LOGIN_ALERTS_ENABLED = false;

export const getLoginAlertsSettings = (user) => {
  const security = user?.profile?.preferences?.security || {};
  const updatedAt = typeof security.loginAlertsEnabledUpdatedAt === 'string'
    && security.loginAlertsEnabledUpdatedAt.trim()
    ? security.loginAlertsEnabledUpdatedAt.trim()
    : null;
  const configured = Boolean(updatedAt);

  return {
    enabled: configured ? Boolean(security.loginAlertsEnabled) : DEFAULT_LOGIN_ALERTS_ENABLED,
    configured,
    updatedAt,
  };
};

export const isLoginAlertsConfigured = (user) => getLoginAlertsSettings(user).configured;

export const shouldSendLoginAlert = (user) => {
  if (process.env.EMAIL_LOGIN_ALERTS_ENABLED === 'false'
    || process.env.EMAIL_LOGIN_ALERTS_ENABLED === '0') {
    return false;
  }
  const { enabled, configured } = getLoginAlertsSettings(user);
  if (!configured) return DEFAULT_LOGIN_ALERTS_ENABLED;
  return enabled;
};

export const buildLoginAlertsProfilePatch = (enabled) => ({
  preferences: {
    security: {
      loginAlertsEnabled: Boolean(enabled),
      loginAlertsEnabledUpdatedAt: new Date().toISOString(),
    },
  },
});

export const isLoginAlertEmailTemplate = (templateKey) =>
  LOGIN_ALERT_EMAIL_TEMPLATES.has(String(templateKey || ''));

export const isCriticalSecurityEmailTemplate = (templateKey) =>
  CRITICAL_SECURITY_EMAIL_TEMPLATES.has(String(templateKey || ''));
