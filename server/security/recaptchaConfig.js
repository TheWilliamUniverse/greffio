export const getRecaptchaConfig = () => ({
  enabled: process.env.RECAPTCHA_FALLBACK_ENABLED === 'true'
    && Boolean(process.env.RECAPTCHA_SECRET_KEY),
  siteKey: String(process.env.RECAPTCHA_SITE_KEY || '').trim(),
  secretKey: String(process.env.RECAPTCHA_SECRET_KEY || '').trim(),
});
