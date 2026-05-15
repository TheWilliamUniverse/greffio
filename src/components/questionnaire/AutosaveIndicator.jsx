import React from 'react';

export const AutosaveIndicator = ({ status }) => {
  if (status === 'saving') return <span className="text-xs text-muted-foreground">Sauvegarde automatique...</span>;
  if (status === 'saved') return <span className="text-xs text-emerald-600">Sauvegardé</span>;
  if (status === 'error') return <span className="text-xs text-red-600">Erreur de sauvegarde</span>;
  return <span className="text-xs text-muted-foreground">Autosave activé</span>;
};
