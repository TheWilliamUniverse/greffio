import React from 'react';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';

export const LOGIN_ALERTS_LABEL = 'Recevoir une alerte par email lors d’une nouvelle connexion ou d’une connexion inhabituelle.';
export const LOGIN_ALERTS_HELP = 'Ces alertes vous aident à repérer rapidement une activité suspecte sur votre compte. Vous pouvez modifier ce choix à tout moment dans vos paramètres de sécurité.';

export const LoginAlertsToggle = ({
  enabled,
  onEnabledChange,
  disabled = false,
  id = 'login-alerts-enabled',
}) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-white p-4">
    <div className="space-y-1.5">
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium leading-6 text-foreground">
        {LOGIN_ALERTS_LABEL}
      </Label>
      <p className="text-xs leading-5 text-muted-foreground">{LOGIN_ALERTS_HELP}</p>
    </div>
    <Switch
      id={id}
      checked={Boolean(enabled)}
      onCheckedChange={onEnabledChange}
      disabled={disabled}
      aria-label={LOGIN_ALERTS_LABEL}
    />
  </div>
);
