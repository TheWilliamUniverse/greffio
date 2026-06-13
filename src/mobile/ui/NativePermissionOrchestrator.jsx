import React, { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { MobilePermissionPrompt } from '@/mobile/ui/MobilePermissionPrompt.jsx';
import {
  enableBiometricUnlock,
  getBiometryLabel,
  isBiometricAvailable,
  isBiometricUnlockEnabled,
} from '@/utils/biometricAuth.js';
import { getRefreshToken } from '@/utils/localStorage.js';
import {
  hasCompletedNativeBiometricPrompt,
  markNativeBiometricPromptDone,
  markNativePushPromptReady,
} from '@/utils/nativeAppStorage.js';
import { hasCompletedMobileCockpitOnboarding } from '@/mobile/ui/MobileCockpitOnboarding.jsx';
import { useAuth } from '@/hooks/useAuth.js';

export const NativePermissionOrchestrator = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('Biométrie');

  useEffect(() => {
    if (!isAuthenticated || hasCompletedNativeBiometricPrompt()) return undefined;

    let cancelled = false;

    const maybePrompt = async () => {
      if (!hasCompletedMobileCockpitOnboarding()) return false;

      const available = await isBiometricAvailable();
      const enabled = await isBiometricUnlockEnabled();
      if (!available || enabled) {
        markNativeBiometricPromptDone();
        markNativePushPromptReady();
        return true;
      }

      if (!cancelled) {
        const biometryLabel = await getBiometryLabel();
        setLabel(biometryLabel);
        setOpen(true);
      }
      return true;
    };

    void maybePrompt();
    const timer = window.setInterval(() => {
      void maybePrompt().then((done) => {
        if (done) window.clearInterval(timer);
      });
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, currentUser?.id]);

  const dismiss = () => {
    markNativeBiometricPromptDone();
    markNativePushPromptReady();
    setOpen(false);
  };

  const confirm = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken || !currentUser?.email) {
        throw new Error('SESSION_REQUIRED');
      }
      await enableBiometricUnlock({ email: currentUser.email, refreshToken });
      toast.success(`${label} activé pour déverrouiller Greffio.`);
    } catch (_error) {
      toast.message('Biométrie non activée – vous pourrez l\'activer dans Paramètres.');
    } finally {
      dismiss();
    }
  };

  return (
    <MobilePermissionPrompt
      open={open}
      icon={Fingerprint}
      title={`Déverrouiller avec ${label} ?`}
      description="Accédez plus vite à votre espace sans resaisir votre mot de passe à chaque ouverture."
      benefit="Vous gardez le contrôle – désactivable dans Paramètres."
      confirmLabel={`Activer ${label}`}
      onConfirm={() => { void confirm(); }}
      onCancel={dismiss}
    />
  );
};
