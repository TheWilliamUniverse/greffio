import { useEffect } from 'react';

/** Ajuste un inset bas quand le clavier virtuel réduit le viewport (mobile natif / web). */
export const useMobileKeyboardInset = (enabled = true) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.visualViewport) return undefined;

    const syncInset = () => {
      const viewport = window.visualViewport;
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--greffio-keyboard-inset', `${Math.round(inset)}px`);
    };

    syncInset();
    window.visualViewport.addEventListener('resize', syncInset);
    window.visualViewport.addEventListener('scroll', syncInset);
    return () => {
      window.visualViewport.removeEventListener('resize', syncInset);
      window.visualViewport.removeEventListener('scroll', syncInset);
      document.documentElement.style.removeProperty('--greffio-keyboard-inset');
    };
  }, [enabled]);
};
