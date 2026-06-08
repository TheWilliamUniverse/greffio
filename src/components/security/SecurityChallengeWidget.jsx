import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSecurityConfig } from '@/hooks/useSecurityConfig.js';

const TURNSTILE_SCRIPT_ID = 'greffio-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const RECAPTCHA_SCRIPT_ID = 'greffio-recaptcha-script';
const RECAPTCHA_SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit';

const loadScript = ({ id, src, onReady }) => new Promise((resolve, reject) => {
  if (onReady()) {
    resolve();
    return;
  }
  const existing = document.getElementById(id);
  if (existing) {
    existing.addEventListener('load', resolve);
    existing.addEventListener('error', reject);
    return;
  }
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  script.defer = true;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

export const SecurityChallengeWidget = ({
  action,
  onTokens,
  className = '',
}) => {
  const security = useSecurityConfig();
  const turnstileRef = useRef(null);
  const recaptchaRef = useRef(null);
  const turnstileWidgetId = useRef(null);
  const [turnstileFailed, setTurnstileFailed] = useState(false);

  const provider = security.captchaProvider === 'recaptcha' || turnstileFailed
    ? 'recaptcha'
    : 'turnstile';

  const recaptchaPrimary = security.captchaProvider === 'recaptcha' && security.recaptchaSiteKey;
  const challengeEnabled = security.loaded && (
    (security.turnstileEnabled && security.turnstileSiteKey)
    || recaptchaPrimary
    || (security.recaptchaFallbackEnabled && security.recaptchaSiteKey)
  );

  const emitTokens = useCallback((next) => {
    onTokens?.({
      provider,
      turnstileToken: next.turnstileToken || '',
      recaptchaToken: next.recaptchaToken || '',
    });
  }, [onTokens, provider]);

  useEffect(() => {
    if (!challengeEnabled) {
      emitTokens({ turnstileToken: '', recaptchaToken: '' });
      return undefined;
    }

    let cancelled = false;

    const renderTurnstile = async () => {
      if (!security.turnstileEnabled || !security.turnstileSiteKey || !turnstileRef.current) return;
      try {
        await loadScript({
          id: TURNSTILE_SCRIPT_ID,
          src: TURNSTILE_SCRIPT_SRC,
          onReady: () => Boolean(window.turnstile),
        });
        if (cancelled || !turnstileRef.current || !window.turnstile) return;
        if (turnstileWidgetId.current != null) {
          window.turnstile.remove(turnstileWidgetId.current);
          turnstileWidgetId.current = null;
        }
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: security.turnstileSiteKey,
          action,
          theme: 'light',
          size: 'flexible',
          callback: (token) => emitTokens({ turnstileToken: token, recaptchaToken: '' }),
          'expired-callback': () => emitTokens({ turnstileToken: '', recaptchaToken: '' }),
          'error-callback': () => {
            setTurnstileFailed(true);
            emitTokens({ turnstileToken: '', recaptchaToken: '' });
          },
        });
      } catch (_error) {
        setTurnstileFailed(true);
        emitTokens({ turnstileToken: '', recaptchaToken: '' });
      }
    };

    const renderRecaptcha = async () => {
      if (!security.recaptchaSiteKey || !recaptchaRef.current) return;
      try {
        await loadScript({
          id: RECAPTCHA_SCRIPT_ID,
          src: RECAPTCHA_SCRIPT_SRC,
          onReady: () => Boolean(window.grecaptcha),
        });
        if (cancelled || !recaptchaRef.current || !window.grecaptcha) return;
        window.grecaptcha.ready(() => {
          if (cancelled || !recaptchaRef.current) return;
          window.grecaptcha.render(recaptchaRef.current, {
            sitekey: security.recaptchaSiteKey,
            theme: 'light',
            callback: (token) => emitTokens({ turnstileToken: '', recaptchaToken: token }),
            'expired-callback': () => emitTokens({ turnstileToken: '', recaptchaToken: '' }),
          });
        });
      } catch (_error) {
        emitTokens({ turnstileToken: '', recaptchaToken: '' });
      }
    };

    if (provider === 'recaptcha') {
      void renderRecaptcha();
    } else {
      void renderTurnstile();
    }

    return () => {
      cancelled = true;
      if (turnstileWidgetId.current != null && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [
    action,
    challengeEnabled,
    emitTokens,
    provider,
    security.recaptchaSiteKey,
    security.recaptchaFallbackEnabled,
    security.turnstileEnabled,
    security.turnstileSiteKey,
  ]);

  if (!challengeEnabled) return null;

  return (
    <div className={`rounded-md border border-border/80 bg-muted/30 px-3 py-2 ${className}`.trim()}>
      <p className="mb-2 text-xs text-muted-foreground">
        {provider === 'recaptcha'
          ? 'Vérification discrète Greffio'
          : 'Vérification discrète Greffio'}
      </p>
      {provider === 'recaptcha' ? (
        <div ref={recaptchaRef} aria-label="Vérification de sécurité" />
      ) : (
        <div ref={turnstileRef} className="min-h-[1px]" aria-label="Vérification de sécurité" />
      )}
    </div>
  );
};
