import React, { useEffect, useState } from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { getBiometryLabel } from '@/utils/biometricAuth.js';

export const BiometricUnlockScreen = ({ onUnlock, onUsePassword, error, user }) => {
  const [label, setLabel] = useState('Biométrie');

  useEffect(() => {
    void getBiometryLabel().then(setLabel);
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f8fc] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <GreffioLogo variant="mark" className="mb-6 h-12 w-auto" />
      <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-white p-6 text-center shadow-[0_8px_30px_rgba(15,39,80,0.08)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">Greffio verrouillé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user?.firstName ? `Bonjour ${user.firstName}, ` : ''}
          déverrouillez avec {label}.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <Button className="mt-6 w-full rounded-2xl" onClick={() => void onUnlock?.()}>
          <Fingerprint className="h-4 w-4" />
          Déverrouiller
        </Button>
        {onUsePassword ? (
          <Button type="button" variant="ghost" className="mt-2 w-full rounded-2xl" onClick={() => void onUsePassword?.()}>
            Se connecter avec mon mot de passe
          </Button>
        ) : null}
      </div>
    </div>
  );
};
