import React from 'react';
import { AppUpdateDialog } from '@/components/AppUpdateDialog.jsx';
import { useAppUpdate } from '@/hooks/useAppUpdate.js';
import { isCapacitorNative } from '@/utils/platform.js';

/**
 * Compose le hook `useAppUpdate` avec la modale.
 * Activé uniquement sur les builds natifs (Capacitor) – sur le web la
 * notion de "mise à jour applicative" ne s'applique pas (le navigateur
 * recharge toujours la dernière version déployée).
 */
export const AppUpdateGate = () => {
  const native = isCapacitorNative();
  const { state, open, starting, startUpdate, dismiss } = useAppUpdate({
    enabled: native,
  });

  if (!native) return null;

  return (
    <AppUpdateDialog
      open={open}
      state={state}
      starting={starting}
      onUpdate={startUpdate}
      onDismiss={dismiss}
    />
  );
};

export default AppUpdateGate;
