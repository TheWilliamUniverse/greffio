import { useEffect, useState } from 'react';
import { runtimeConfig } from '@/config/runtime.js';
import { securityConfig as viteSecurityConfig } from '@/config/security.js';

const buildFallbackConfig = () => ({
  captchaProvider: 'none',
  turnstileEnabled: viteSecurityConfig.turnstileEnabled,
  turnstileSiteKey: viteSecurityConfig.turnstileSiteKey,
  recaptchaFallbackEnabled: false,
  recaptchaSiteKey: '',
  turnstileOnContact: viteSecurityConfig.turnstileOnContact,
  turnstileOnSignup: viteSecurityConfig.turnstileOnSignup,
  turnstileOnLoginRisky: viteSecurityConfig.turnstileOnLoginRisky,
  turnstileOnPasswordReset: viteSecurityConfig.turnstileOnPasswordReset,
  loaded: true,
  source: 'vite',
});

let cachedConfig = null;
let inflight = null;

const fetchSecurityConfig = async () => {
  if (cachedConfig) return cachedConfig;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/public/security-config`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('SECURITY_CONFIG_UNAVAILABLE');
      const payload = await response.json();
      cachedConfig = {
        captchaProvider: payload?.captchaProvider || 'none',
        turnstileEnabled: Boolean(payload?.turnstileEnabled && payload?.turnstileSiteKey),
        turnstileSiteKey: payload?.turnstileSiteKey || '',
        recaptchaFallbackEnabled: Boolean(payload?.recaptchaFallbackEnabled && payload?.recaptchaSiteKey),
        recaptchaSiteKey: payload?.recaptchaSiteKey || '',
        turnstileOnContact: payload?.turnstileOnContact !== false,
        turnstileOnSignup: payload?.turnstileOnSignup !== false,
        turnstileOnLoginRisky: payload?.turnstileOnLoginRisky !== false,
        turnstileOnPasswordReset: payload?.turnstileOnPasswordReset !== false,
        loaded: true,
        source: 'api',
      };
      return cachedConfig;
    } catch (_error) {
      cachedConfig = buildFallbackConfig();
      return cachedConfig;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

export const useSecurityConfig = () => {
  const [config, setConfig] = useState(cachedConfig || {
    ...buildFallbackConfig(),
    loaded: Boolean(cachedConfig),
  });

  useEffect(() => {
    let cancelled = false;
    void fetchSecurityConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
};
