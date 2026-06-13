import { getNativePlatform, isCapacitorNative } from '@/utils/platform.js';

/** En-têtes API pour clients Capacitor – captcha allégé côté serveur. */
export const nativeClientAuthHeaders = () => {
  if (!isCapacitorNative()) return {};
  const platform = getNativePlatform();
  const headers = {
    'X-Greffio-Client': `greffio-native-${platform}`,
  };
  const secret = String(import.meta.env.VITE_GREFFIO_NATIVE_CLIENT_SECRET || '').trim();
  if (secret) {
    headers['X-Greffio-Client-Token'] = secret;
  }
  return headers;
};

export const isNativeClientSecretConfigured = () => Boolean(
  String(import.meta.env.VITE_GREFFIO_NATIVE_CLIENT_SECRET || '').trim(),
);
