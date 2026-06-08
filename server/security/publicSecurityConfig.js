import { resolveActiveCaptchaProvider } from './captchaVerify.js';
import { getRecaptchaConfig } from './recaptchaConfig.js';
import { getTurnstileConfig } from './turnstileConfig.js';

export const buildPublicSecurityConfig = () => {
  const turnstile = getTurnstileConfig();
  const recaptcha = getRecaptchaConfig();
  const turnstileSiteKey = String(process.env.TURNSTILE_SITE_KEY || '').trim();
  const turnstileEnabled = turnstile.enabled && Boolean(turnstileSiteKey);
  const captchaProvider = resolveActiveCaptchaProvider();
  const recaptchaActive = captchaProvider === 'recaptcha';

  const captchaLive = captchaProvider !== 'none';
  const challengeRequiredOn = (enforceFlag, uiFlag) => (
    captchaLive && (enforceFlag || process.env[uiFlag] !== 'false')
  );

  return {
    ok: true,
    captchaProvider,
    turnstileEnabled: turnstileEnabled && captchaProvider === 'turnstile',
    turnstileSiteKey: captchaProvider === 'turnstile' ? turnstileSiteKey : '',
    recaptchaEnabled: recaptcha.enabled && Boolean(recaptcha.siteKey),
    recaptchaFallbackEnabled: recaptcha.enabled,
    recaptchaSiteKey: recaptchaActive ? recaptcha.siteKey : '',
    turnstileOnContact: challengeRequiredOn(turnstile.enforceContact, 'TURNSTILE_UI_CONTACT'),
    turnstileOnSignup: challengeRequiredOn(turnstile.enforceSignup, 'TURNSTILE_UI_SIGNUP'),
    turnstileOnLoginRisky: captchaLive && process.env.TURNSTILE_RISKY_LOGIN === 'true',
    turnstileOnPasswordReset: captchaLive && (
      turnstile.enforceForgotPassword
      || turnstile.enforceResetPassword
      || process.env.TURNSTILE_UI_PASSWORD_RESET !== 'false'
    ),
  };
};
