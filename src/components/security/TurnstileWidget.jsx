import React, { useEffect, useRef } from 'react';
import { useSecurityConfig } from '@/hooks/useSecurityConfig.js';

const TURNSTILE_SCRIPT_ID = 'greffio-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const loadTurnstileScript = () => new Promise((resolve, reject) => {
  if (window.turnstile) {
    resolve(window.turnstile);
    return;
  }
  const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
  if (existing) {
    existing.addEventListener('load', () => resolve(window.turnstile));
    existing.addEventListener('error', reject);
    return;
  }
  const script = document.createElement('script');
  script.id = TURNSTILE_SCRIPT_ID;
  script.src = TURNSTILE_SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  script.onload = () => resolve(window.turnstile);
  script.onerror = reject;
  document.head.appendChild(script);
});

export const TurnstileWidget = ({
  action,
  onToken,
  className = '',
}) => {
  const security = useSecurityConfig();
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const enabled = security.loaded
    && security.turnstileEnabled
    && Boolean(security.turnstileSiteKey);

  useEffect(() => {
    if (!enabled || !containerRef.current) return undefined;

    let cancelled = false;

    const renderWidget = async () => {
      try {
        await loadTurnstileScript();
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current != null) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: security.turnstileSiteKey,
          action,
          theme: 'light',
          size: 'flexible',
          callback: (token) => onToken?.(token),
          'expired-callback': () => onToken?.(''),
          'error-callback': () => onToken?.(''),
        });
      } catch (_error) {
        onToken?.('');
      }
    };

    void renderWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, enabled, onToken, security.turnstileSiteKey]);

  if (!enabled) return null;

  return (
    <div className={`rounded-md border border-border/80 bg-muted/30 px-3 py-2 ${className}`.trim()}>
      <p className="mb-2 text-xs text-muted-foreground">Vérification discrète Greffio</p>
      <div ref={containerRef} className="min-h-[1px]" aria-label="Vérification de sécurité" />
    </div>
  );
};
