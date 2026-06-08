import { getTurnstileConfig } from './turnstileConfig.js';

export const buildPublicSecurityConfig = () => {
  const turnstile = getTurnstileConfig();
  const siteKey = String(process.env.TURNSTILE_SITE_KEY || '').trim();
  const enabled = turnstile.enabled && Boolean(siteKey);

  return {
    ok: true,
    turnstileEnabled: enabled,
    turnstileSiteKey: enabled ? siteKey : '',
    turnstileOnContact: enabled && (turnstile.enforceContact || process.env.TURNSTILE_UI_CONTACT !== 'false'),
    turnstileOnSignup: enabled && (turnstile.enforceSignup || process.env.TURNSTILE_UI_SIGNUP !== 'false'),
    turnstileOnLoginRisky: enabled && process.env.TURNSTILE_RISKY_LOGIN === 'true',
    turnstileOnPasswordReset: enabled && (
      turnstile.enforceForgotPassword
      || turnstile.enforceResetPassword
      || process.env.TURNSTILE_UI_PASSWORD_RESET !== 'false'
    ),
  };
};
