import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

/**
 * Padding bas pour contenu au-dessus de la bottom nav mobile.
 */
export function useMobileSafeBottomPadding({ hasBottomNav = true } = {}) {
  if (!hasBottomNav) return '';

  if (isCapacitorNative()) {
    return 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+var(--mobile-page-bottom-extra))]';
  }

  if (isMobileBrowserViewport()) {
    return 'pb-[calc(var(--bottom-nav-height-web)+env(safe-area-inset-bottom)+var(--mobile-page-bottom-extra))]';
  }

  return '';
}

export const MOBILE_BOTTOM_SPACER_CLASS = 'h-24 md:hidden';

/** Alias documenté dans l’audit mobile – même logique que useMobileSafeBottomPadding. */
export function useWebMobileBottomNavPadding(options) {
  return useMobileSafeBottomPadding(options);
}
