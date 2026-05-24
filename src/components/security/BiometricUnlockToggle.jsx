import React, { useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { getRefreshToken } from '@/utils/localStorage.js';
import {
  disableBiometricUnlock,
  enableBiometricUnlock,
  getBiometryLabel,
  isBiometricAvailable,
  isBiometricUnlockEnabled,
  refreshBiometricCredentials,
} from '@/utils/biometricAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';

export const BiometricUnlockToggle = () => {
  const { currentUser } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState('Biométrie');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isCapacitorNative()) {
        if (mounted) setLoading(false);
        return;
      }
      const [isAvailable, isEnabled, biometryLabel] = await Promise.all([
        isBiometricAvailable(),
        isBiometricUnlockEnabled(),
        getBiometryLabel(),
      ]);
      if (!mounted) return;
      setAvailable(isAvailable);
      setEnabled(isEnabled);
      setLabel(biometryLabel);
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async (next) => {
    setSaving(true);
    try {
      if (next) {
        const refreshToken = getRefreshToken();
        if (!refreshToken || !currentUser?.email) {
          toast.error('Reconnectez-vous avant d’activer la biométrie.');
          return;
        }
        await enableBiometricUnlock({ email: currentUser.email, refreshToken });
        setEnabled(true);
        toast.success(`${label} activé pour le déverrouillage local.`);
      } else {
        await disableBiometricUnlock();
        setEnabled(false);
        toast.success('Déverrouillage biométrique désactivé.');
      }
    } catch (_error) {
      toast.error('Impossible de modifier le déverrouillage biométrique.');
    } finally {
      setSaving(false);
    }
  };

  if (!isCapacitorNative()) return null;

  return (
    <div className="rounded-md border border-border bg-white p-6 shadow-elevation-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Fingerprint className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold">Déverrouillage {label}</h3>
          <p className="text-sm text-muted-foreground">
            Après connexion, déverrouillez l’app localement sans retaper votre mot de passe.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Vérification de la biométrie…
        </div>
      ) : !available ? (
        <p className="text-sm text-muted-foreground">
          Biométrie indisponible sur cet appareil.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="biometric-unlock-toggle" className="text-sm font-medium">
            Activer {label} au lancement
          </Label>
          <Switch
            id="biometric-unlock-toggle"
            checked={enabled}
            disabled={saving}
            onCheckedChange={(value) => void handleToggle(value)}
          />
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Greffio ne stocke jamais votre mot de passe. Seul un jeton de session chiffré est conservé dans le coffre natif de l’appareil.
      </p>
    </div>
  );
};
