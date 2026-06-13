import React, { useEffect, useState } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { isCapacitorNative } from '@/utils/platform.js';
import { useMobileAppInfo } from '@/mobile/hooks/useMobileAppInfo.js';
import { MobileConnectionStatusRow } from '@/mobile/MobileNativeOfflineBanner.jsx';
import { getBiometryLabel, isBiometricUnlockEnabled } from '@/utils/biometricAuth.js';

/**
 * Centre d'état natif – rassure sur connexion, notifications, biométrie, version (Natif Android).
 */
export const MobileNativeStatusCenter = () => {
  const { version, build, loading: appInfoLoading } = useMobileAppInfo();
  const [pushStatus, setPushStatus] = useState('…');
  const [biometryStatus, setBiometryStatus] = useState('…');

  useEffect(() => {
    if (!isCapacitorNative()) return undefined;
    let mounted = true;

    const load = async () => {
      try {
        const permission = await PushNotifications.checkPermissions?.();
        if (!mounted) return;
        if (permission?.receive === 'granted') setPushStatus('Activées');
        else if (permission?.receive === 'denied') setPushStatus('Désactivées');
        else setPushStatus('Non configurées');
      } catch (_error) {
        if (mounted) setPushStatus('Non configurées');
      }

      try {
        const enabled = await isBiometricUnlockEnabled();
        if (!mounted) return;
        if (enabled) {
          const label = await getBiometryLabel();
          setBiometryStatus(`Activée (${label})`);
        } else {
          setBiometryStatus('Non configurée');
        }
      } catch (_error) {
        if (mounted) setBiometryStatus('Non configurée');
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  if (!isCapacitorNative()) return null;

  const rows = [
    { label: 'Connexion', value: <MobileConnectionStatusRow /> },
    { label: 'Notifications', value: pushStatus },
    { label: 'Biométrie', value: biometryStatus },
    { label: 'Version', value: appInfoLoading ? '…' : (version || '–') },
    { label: 'Build', value: appInfoLoading ? '…' : (build || '–') },
  ];

  return (
    <section className="rounded-3xl border border-border/70 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-primary/80">État de l&apos;application</p>
      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-semibold text-foreground text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
