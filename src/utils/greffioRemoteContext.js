import { Preferences } from '@capacitor/preferences';
import { isCapacitorNative } from '@/utils/platform.js';

export const GREFFIO_REMOTE_CONTEXT_KEY = 'greffio_remote_context_v1';

export const loadCachedRemoteContext = async () => {
  try {
    if (isCapacitorNative()) {
      const { value } = await Preferences.get({ key: GREFFIO_REMOTE_CONTEXT_KEY });
      return value ? JSON.parse(value) : null;
    }
    const raw = sessionStorage.getItem(GREFFIO_REMOTE_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

export const persistRemoteContext = async (payload) => {
  if (!payload || typeof payload !== 'object') return;
  const serialized = JSON.stringify(payload);
  try {
    if (isCapacitorNative()) {
      await Preferences.set({ key: GREFFIO_REMOTE_CONTEXT_KEY, value: serialized });
      return;
    }
    sessionStorage.setItem(GREFFIO_REMOTE_CONTEXT_KEY, serialized);
  } catch (_error) {
    // non-blocking
  }
};
