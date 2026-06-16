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

/** Parcours questionnaire unifié (1 question / écran) sur tous les viewports. */
export const isUnifiedQuestionnairePresentation = () => true;

/** Layout compact questionnaire : app native Capacitor ou web mobile <768px. */
export const isCompactQuestionnaireViewport = () => (
  isCapacitorNative() || isMobileBrowserViewport()
);

/** @deprecated Alias historique – préférer isCompactQuestionnaireViewport pour le layout. */
export const isMobileQuestionnaireViewport = () => isCompactQuestionnaireViewport();

/** Ops cockpit : bloquer le layout desktop compressé sur mobile natif ou web <768px. */
export const isOpsMobileViewport = () => isCapacitorNative() || isMobileBrowserViewport();

/** Routes sans shell mobile (web <768px et app native Capacitor). */
export const MOBILE_SHELL_EXCLUDED_PREFIXES = [
  '/ops',
  '/ops-legacy',
  '/ops-observability',
  '/signature/',
  '/callback',
];

const isMobileShellExcluded = (pathname) => {
  const path = String(pathname || '');
  return MOBILE_SHELL_EXCLUDED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
};

export const shouldUseMobileWebShell = (pathname) => {
  if (isCapacitorNative() || typeof window === 'undefined') return false;
  if (window.innerWidth >= MOBILE_BREAKPOINT) return false;
  return !isMobileShellExcluded(pathname);
};

/** @deprecated Préfixes historiques – le shell natif couvre désormais toutes les routes hors exclusions. */
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

/** Routes auth plein écran dans l'app native (sans barre basse / header public). */
export const NATIVE_AUTH_ROUTE_PREFIXES = [
  '/login',
  '/signup',
  '/password-reset',
  '/credentials-unlock',
];

export const isNativeAuthRoute = (pathname) => {
  const path = String(pathname || '');
  return NATIVE_AUTH_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};

/** App native Capacitor : shell sur toutes les routes sauf ops / signature publique. */
export const shouldUseMobileShell = (pathname) => {
  if (!isCapacitorNative()) return false;
  return !isMobileShellExcluded(pathname);
};

/** Log dev : route × shell natif (Natif Android – dev uniquement). */
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
