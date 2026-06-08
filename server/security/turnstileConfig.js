export const getTurnstileConfig = () => ({
  enabled: process.env.TURNSTILE_ENABLED === 'true' && Boolean(process.env.TURNSTILE_SECRET_KEY),
  secretKey: process.env.TURNSTILE_SECRET_KEY || '',
  enforceLogin: process.env.TURNSTILE_ENFORCE_LOGIN === 'true',
  enforceSignup: process.env.TURNSTILE_ENFORCE_SIGNUP === 'true',
  enforceContact: process.env.TURNSTILE_ENFORCE_CONTACT === 'true',
  enforceForgotPassword: process.env.TURNSTILE_ENFORCE_FORGOT_PASSWORD === 'true',
  enforceResetPassword: process.env.TURNSTILE_ENFORCE_RESET_PASSWORD === 'true',
  riskyLoginThreshold: Number(process.env.TURNSTILE_LOGIN_RISKY_THRESHOLD || 2),
  failOpen: process.env.TURNSTILE_FAIL_OPEN === 'true',
});
