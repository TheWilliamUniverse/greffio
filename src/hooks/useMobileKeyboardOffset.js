import { useEffect, useState } from 'react';

/**
 * Décalage bas quand le clavier mobile réduit le visual viewport (Capacitor / mobile web).
 */
export function useMobileKeyboardOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const update = () => {
      const gap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setOffset(gap > 48 ? Math.round(gap) : 0);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return offset;
}
