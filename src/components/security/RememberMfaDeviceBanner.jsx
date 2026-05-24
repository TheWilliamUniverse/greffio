import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { fetchMfaTrustedDeviceStatus, trustMfaDevice } from '@/api/mfa.js';
import { saveMfaDeviceToken } from '@/utils/mfaDevice.js';

export const RememberMfaDeviceBanner = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await fetchMfaTrustedDeviceStatus();
        if (cancelled) return;
        setVisible(Boolean(payload?.mfaEnabled) && !payload?.remembered);
      } catch (_error) {
        if (!cancelled) setVisible(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRemember = async () => {
    setSaving(true);
    try {
      const payload = await trustMfaDevice();
      saveMfaDeviceToken(payload.deviceToken, payload.expiresAt);
      setVisible(false);
      toast.success(`Cet appareil est mémorisé pendant ${payload.ttlDays || 30} jours.`);
    } catch (_error) {
      toast.error('Impossible d’enregistrer cet appareil pour le moment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !visible) return null;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4e2f5] bg-[#f8fbff] px-4 py-3 text-sm shadow-sm">
      <div className="flex min-w-0 items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Se souvenir de moi</span>
          {' '}
          sur cet appareil pour éviter la double authentification à chaque connexion (30 jours).
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" disabled={saving} onClick={() => setVisible(false)}>
          Plus tard
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={() => void onRemember()}>
          {saving ? 'Enregistrement…' : 'Activer'}
        </Button>
      </div>
    </section>
  );
};
