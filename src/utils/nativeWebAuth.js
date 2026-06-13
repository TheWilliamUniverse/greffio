import { runtimeConfig } from '@/config/runtime.js';
import { App as CapApp } from '@capacitor/app';
import { isCapacitorNative } from '@/utils/platform.js';
import {
  getRefreshToken,
  getToken,
  getUser,
  saveRefreshToken,
  saveToken,
  saveUser,
} from '@/utils/localStorage.js';

export const NATIVE_APP_AUTH_CALLBACK_SCHEME = 'com.greffio.app://auth/callback';

export const buildNativeWebLoginUrl = (returnPath = '/auth/app-bridge') => {
  const url = new URL('/login', runtimeConfig.appUrl);
  url.searchParams.set('nativeApp', '1');
  url.searchParams.set('return', returnPath);
  return url.toString();
};

/** Ouvre la connexion web (navigateur système en natif, sinon même onglet). */
export const openNativeWebLoginUrl = async (returnPath = '/auth/app-bridge') => {
  const url = buildNativeWebLoginUrl(returnPath);
  try {
    if (isCapacitorNative() && CapApp?.openUrl) {
      await CapApp.openUrl({ url });
      return true;
    }
  } catch (_error) {
    // fallback ci-dessous
  }
  window.location.assign(url);
  return true;
};

export const buildNativeWebSignupUrl = (returnPath = '/auth/app-bridge') => {
  const url = new URL('/signup', runtimeConfig.appUrl);
  url.searchParams.set('nativeApp', '1');
  url.searchParams.set('return', returnPath);
  return url.toString();
};

export const isNativeAppAuthCallbackUrl = (rawUrl) => {
  const value = String(rawUrl || '');
  if (!value) return false;
  return value.startsWith(NATIVE_APP_AUTH_CALLBACK_SCHEME)
    || value.includes('://auth/callback');
};

export const readNativeAuthBridgeSession = () => {
  const accessToken = getToken();
  const refreshToken = getRefreshToken();
  const user = getUser();
  if (!accessToken || !refreshToken || !user) return null;
  return { accessToken, refreshToken, user };
};

export const encodeNativeAuthBridgePayload = (session) => {
  const json = JSON.stringify(session);
  return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
};

export const decodeNativeAuthBridgePayload = (encoded) => {
  if (!encoded) return null;
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const parsed = JSON.parse(json);
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
};

export const buildNativeAuthCallbackUrl = (session) => {
  const payload = encodeNativeAuthBridgePayload(session);
  return `${NATIVE_APP_AUTH_CALLBACK_SCHEME}?payload=${payload}`;
};

export const persistNativeAuthSession = (session) => {
  saveToken(session.accessToken);
  saveRefreshToken(session.refreshToken);
  saveUser(session.user);
};

export const parseNativeAuthCallbackUrl = (rawUrl) => {
  const value = String(rawUrl || '');
  if (!value) return null;
  try {
    const url = new URL(value.replace(/^com\.greffio\.app:\/\//, 'https://greffio.app/'));
    return decodeNativeAuthBridgePayload(url.searchParams.get('payload'));
  } catch (_error) {
    const match = value.match(/[?&]payload=([^&]+)/);
    return decodeNativeAuthBridgePayload(match?.[1] || '');
  }
};
