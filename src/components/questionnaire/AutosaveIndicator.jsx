import React from 'react';
import { Check, CloudOff, Loader2 } from 'lucide-react';

export const AutosaveIndicator = ({ status }) => {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
        Sauvegarde…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        Sauvegardé
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        Sync en attente
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Sauvegarde automatique</span>
  );
};
