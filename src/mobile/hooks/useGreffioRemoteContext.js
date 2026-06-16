import { useEffect } from 'react';
import { fetchAppContext } from '@/api/appContext.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { persistRemoteContext } from '@/utils/greffioRemoteContext.js';

/**
 * Charge /api/app-context au démarrage native et persiste l'audit remote localement.
 */
export const useGreffioRemoteContext = () => {
  useEffect(() => {
    if (!isCapacitorNative()) return undefined;
    let cancelled = false;
    const sync = async () => {
      try {
        const payload = await fetchAppContext();
        if (cancelled || !payload?.ok) return;
        await persistRemoteContext(payload);
      } catch (_error) {
        // garde le cache précédent si hors ligne
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, []);
};
