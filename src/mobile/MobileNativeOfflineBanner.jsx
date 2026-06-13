import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { isCapacitorNative } from '@/utils/platform.js';
import { triggerMobileHaptic } from '@/utils/mobileHaptics.js';

const OFFLINE_COPY = 'Connexion indisponible. Vos informations seront rechargées dès que la connexion reviendra.';

/**
 * Bannière offline explicite – app native Capacitor Android/iOS (Natif Android).
 */
export const MobileNativeOfflineBanner = () => {
  const [offline, setOffline] = useState(() => (
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  ));
  const wasOfflineRef = useRef(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;

    const goOnline = () => {
      setOffline(false);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        void triggerMobileHaptic('light');
        toast.success('Connexion rétablie. Mise à jour de vos dossiers…', { duration: 4000 });
      }
    };
    const goOffline = () => {
      setOffline(true);
      wasOfflineRef.current = true;
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setOffline(!navigator.onLine);
    wasOfflineRef.current = !navigator.onLine;

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!isCapacitorNative()) return null;

  if (!offline) return null;

  return (
    <div
      className="border-b border-amber-300/80 bg-amber-50 px-4 py-2.5 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p className="flex items-start gap-2">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{OFFLINE_COPY}</span>
      </p>
    </div>
  );
};

/** Indicateur compact en ligne – utilisé dans Compte (Premium). */
export const MobileConnectionStatusRow = () => {
  const [online, setOnline] = useState(() => (
    typeof navigator !== 'undefined' ? navigator.onLine : true
  ));

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!isCapacitorNative()) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {online ? (
        <>
          <Wifi className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          En ligne
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
          Hors ligne
        </>
      )}
    </span>
  );
};
