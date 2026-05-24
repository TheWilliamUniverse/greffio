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
  '/team',
];

export const shouldUseMobileShell = (pathname) => {
  if (!isCapacitorNative()) return false;
  const path = String(pathname || '');
  return MOBILE_SHELL_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
};
