import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { isCapacitorNative } from '@/utils/platform.js';

/**
 * Bannière offline explicite — app native Capacitor Android/iOS.
 */
export const MobileNativeOfflineBanner = () => {
  const [offline, setOffline] = useState(() => (
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  ));

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;

    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isCapacitorNative() || !offline) return null;

  return (
    <div
      className="border-b border-amber-300/80 bg-amber-50 px-4 py-2.5 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p className="flex items-start gap-2">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Connexion indisponible. Vos données seront rechargées dès le retour réseau.
        </span>
      </p>
    </div>
  );
};
