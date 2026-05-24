import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { updateUserProfileApi } from '@/api/profile.js';
import { LoginAlertsToggle } from '@/components/security/LoginAlertsToggle.jsx';
import { buildLoginAlertsProfilePatch, rememberLoginAlertsChoice } from '@/utils/userProfile.js';

export const LoginAlertsPromptBanner = ({ initialEnabled = true, onSaved }) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  const saveChoice = async (nextEnabled) => {
    setSaving(true);
    try {
      const payload = await updateUserProfileApi({
        profile: buildLoginAlertsProfilePatch(nextEnabled),
      });
      const user = payload?.user || null;
      if (user) {
        rememberLoginAlertsChoice(user);
      }
      onSaved?.(user);
      toast.success(nextEnabled
        ? 'Alertes de connexion activées.'
        : 'Alertes de connexion désactivées.');
    } catch (_error) {
      toast.error('Impossible d’enregistrer votre choix pour le moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-md border border-primary/20 bg-secondary/40 p-5 shadow-elevation-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary">
          <Bell className="h-4 w-4" />
        </span>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-bold text-foreground">Sécurité du compte</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Souhaitez-vous recevoir des alertes email lors de nouvelles connexions à votre compte ?
            </p>
          </div>
          <LoginAlertsToggle
            id="login-alerts-banner"
            enabled={enabled}
            onEnabledChange={setEnabled}
            disabled={saving}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void saveChoice(enabled)}>
              Enregistrer mon choix
            </Button>
            <Button type="button" size="sm" variant="outline" className="bg-white" disabled={saving} onClick={() => void saveChoice(true)}>
              Garder activé
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
