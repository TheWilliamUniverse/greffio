export const securityConfig = {
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
  turnstileEnabled: import.meta.env.VITE_TURNSTILE_ENABLED === 'true'
    && Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY),
  turnstileOnContact: import.meta.env.VITE_TURNSTILE_ON_CONTACT !== 'false',
  turnstileOnSignup: import.meta.env.VITE_TURNSTILE_ON_SIGNUP !== 'false',
  turnstileOnLoginRisky: import.meta.env.VITE_TURNSTILE_ON_LOGIN_RISKY !== 'false',
  turnstileOnPasswordReset: import.meta.env.VITE_TURNSTILE_ON_PASSWORD_RESET !== 'false',
};

export const mapSecurityApiError = (error) => {
  const code = error?.payload?.error || error?.code || error?.message;
  if (code === 'RATE_LIMITED') {
    return error?.payload?.message || 'Pour protéger votre compte, merci de patienter quelques minutes avant de réessayer.';
  }
  if (code === 'SECURITY_CHECK_REQUIRED') {
    return error?.payload?.message || 'Une vérification de sécurité est nécessaire. Réessayez dans un instant.';
  }
  return null;
};
