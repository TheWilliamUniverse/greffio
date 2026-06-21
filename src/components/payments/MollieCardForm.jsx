import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { cn } from '@/lib/utils.js';

const MOLLIE_SCRIPT_SRC = 'https://js.mollie.com/v1/mollie.js';

let mollieScriptPromise = null;

const loadMollieScript = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('MOLLIE_BROWSER_ONLY'));
  if (window.Mollie) return Promise.resolve(window.Mollie);
  if (mollieScriptPromise) return mollieScriptPromise;

  mollieScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MOLLIE_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Mollie));
      existing.addEventListener('error', () => reject(new Error('MOLLIE_SCRIPT_FAILED')));
      if (window.Mollie) resolve(window.Mollie);
      return;
    }
    const script = document.createElement('script');
    script.src = MOLLIE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Mollie);
    script.onerror = () => reject(new Error('MOLLIE_SCRIPT_FAILED'));
    document.body.appendChild(script);
  });

  return mollieScriptPromise;
};

const GREFFIO_COMPONENT_STYLES = {
  base: {
    color: '#1e3a5f',
    fontSize: '16px',
    fontWeight: '500',
    backgroundColor: '#ffffff',
    '::placeholder': {
      color: 'rgba(71, 85, 105, 0.45)',
    },
  },
  valid: {
    color: '#1e3a5f',
  },
  invalid: {
    color: '#b91c1c',
  },
};

export const MollieCardForm = forwardRef(({
  profileId,
  testmode = false,
  locale = 'fr_FR',
  className,
  onReadyChange,
  onError,
}, ref) => {
  const mountRef = useRef(null);
  const mollieRef = useRef(null);
  const cardFormRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const mount = async () => {
      if (!profileId || !mountRef.current) return;
      try {
        const MollieFactory = await loadMollieScript();
        if (cancelled) return;
        const mollie = MollieFactory(profileId, { locale, testmode });
        mollieRef.current = mollie;
        const cardForm = mollie.createComponent('card', {
          styles: GREFFIO_COMPONENT_STYLES,
        });
        cardFormRef.current = cardForm;
        mountRef.current.innerHTML = '';
        cardForm.mount(mountRef.current);
        setReady(true);
        setLoadError(null);
        onReadyChange?.(true);
      } catch (error) {
        if (cancelled) return;
        setReady(false);
        setLoadError(error?.message || 'MOLLIE_CARD_FORM_FAILED');
        onReadyChange?.(false);
        onError?.(error);
      }
    };
    void mount();
    return () => {
      cancelled = true;
      cardFormRef.current = null;
      mollieRef.current = null;
      setReady(false);
      onReadyChange?.(false);
    };
  }, [profileId, testmode, locale, onReadyChange, onError]);

  useImperativeHandle(ref, () => ({
    isReady: () => ready,
    createToken: async () => {
      if (!mollieRef.current) {
        return { token: null, error: 'MOLLIE_NOT_READY' };
      }
      const { token, error } = await mollieRef.current.createToken();
      return { token, error: error?.message || error || null };
    },
  }), [ready]);

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={mountRef}
        className="min-h-[52px] rounded-xl border border-[#dbe7f7] bg-white px-3 py-2 shadow-[inset_0_1px_2px_rgba(30,77,140,0.04)] [&_.mollie-component]:min-h-[44px] [&_.mollie-component]:rounded-lg [&_.mollie-component]:border [&_.mollie-component]:border-[#dbe7f7] [&_.mollie-component]:bg-white"
      />
      {loadError ? (
        <p className="text-xs text-amber-800">
          Formulaire carte indisponible. Utilisez un autre moyen de paiement ou réessayez.
        </p>
      ) : null}
    </div>
  );
});

MollieCardForm.displayName = 'MollieCardForm';
