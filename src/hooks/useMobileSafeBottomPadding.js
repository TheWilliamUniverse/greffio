import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

/**
 * Padding bas pour contenu au-dessus de la bottom nav mobile.
 */
export function useMobileSafeBottomPadding({ hasBottomNav = true } = {}) {
  if (!hasBottomNav) return '';

  if (isCapacitorNative()) {
    return 'pb-[calc(5.25rem+env(safe-area-inset-bottom))]';
  }

  if (isMobileBrowserViewport()) {
    return 'pb-[calc(4.75rem+env(safe-area-inset-bottom))]';
  }

  return '';
}

export const MOBILE_BOTTOM_SPACER_CLASS = 'h-24 md:hidden';

/** Alias documenté dans l’audit mobile — même logique que useMobileSafeBottomPadding. */
export function useWebMobileBottomNavPadding(options) {
  return useMobileSafeBottomPadding(options);
}
