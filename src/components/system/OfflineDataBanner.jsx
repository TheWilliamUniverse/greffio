import React from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineDataBanner = ({ cachedAt, className = '' }) => {
  if (!cachedAt) return null;
  const label = new Date(cachedAt).toLocaleString('fr-FR');
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}>
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Connexion limitée – données affichées depuis la dernière synchronisation réussie ({label}).
        Les informations peuvent ne pas refléter l’état actuel de votre dossier.
      </p>
    </div>
  );
};
