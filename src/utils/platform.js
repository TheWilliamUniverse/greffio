import { Capacitor } from '@capacitor/core';

export const isCapacitorNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (_error) {
    return false;
  }
};

export const getNativePlatform = () => {
  try {
    return Capacitor.getPlatform();
  } catch (_error) {
    return 'web';
  }
};

export const isMobileApp = () => isCapacitorNative();

export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

/** Tablette (768–1024) : layout desktop, pas mobile étiré. */
export const isTabletViewport = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT;
};

export const isDesktopBrowserViewport = () => {
  if (typeof window === 'undefined') return true;
  if (isCapacitorNative()) return false;
  return window.innerWidth >= MOBILE_BREAKPOINT;
};

export const isMobileBrowserViewport = () => {
  if (typeof window === 'undefined') return false;
  return !isCapacitorNative() && window.innerWidth < MOBILE_BREAKPOINT;
};

const MOBILE_WEB_SHELL_EXCLUDED_PREFIXES = [
  '/ops',
  '/ops-legacy',
  '/ops-observability',
  '/signature/',
];

export const shouldUseMobileWebShell = (pathname) => {
  if (isCapacitorNative() || typeof window === 'undefined') return false;
  if (window.innerWidth >= MOBILE_BREAKPOINT) return false;
  const path = String(pathname || '');
  return !MOBILE_WEB_SHELL_EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
};

export const MOBILE_SHELL_PREFIXES = [
  '/dashboard',
  '/dossiers',
  '/dossier',
  '/documents',
  '/mobile',
  '/chat',
  '/profil',
  '/settings',
  '/questionnaire',
  '/statuts-gratuits',
  '/team',
  '/analytics',
  '/statuts',
  '/interfaces',
  '/simulateur',
  '/signature',
  '/paiement',
  '/tarifs',
  '/contact',
];

export const shouldUseMobileShell = (pathname) => {
  if (!isCapacitorNative()) return false;
  const path = String(pathname || '');
  return MOBILE_SHELL_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};

/** Log dev : route × shell natif (Natif Android — dev uniquement). */
export const logMobileShellRoute = (pathname) => {
  if (!import.meta.env.DEV || !isCapacitorNative()) return;
  const path = String(pathname || '');
  const shell = shouldUseMobileShell(path);
  // eslint-disable-next-line no-console
  console.debug('[MobileGreffio:route]', {
    route: path,
    native: true,
    shell,
  });
};
