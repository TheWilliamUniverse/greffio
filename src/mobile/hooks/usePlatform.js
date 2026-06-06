import { useEffect, useState } from 'react';
import { isCapacitorNative } from '@/utils/platform.js';

const MOBILE_BREAKPOINT = 768;

export const usePlatform = () => {
  const [viewport, setViewport] = useState(() => ({
    isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
    isNativeApp: isCapacitorNative(),
    isMobileBrowser: typeof window !== 'undefined'
      ? !isCapacitorNative() && window.innerWidth < MOBILE_BREAKPOINT
      : false,
  }));

  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setViewport({
        isMobile,
        isNativeApp: isCapacitorNative(),
        isMobileBrowser: !isCapacitorNative() && isMobile,
      });
    };
    update();
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return viewport;
};
