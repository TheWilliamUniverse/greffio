import React from 'react';
import { PenLine } from 'lucide-react';

/**
 * Rappel UX : signature Greffio (interne) par défaut ; SignWell uniquement si configuré côté serveur.
 */
export const GreffioSignatureInfoBanner = ({ className = '' }) => (
  <div
    className={`flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground ${className}`}
  >
    <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
    <p>
      <span className="font-semibold text-foreground">Signature Greffio</span>
      {' — '}
      Vous signez en priorité dans l’espace Greffio (aperçu, confirmation, enregistrement dans le dossier).
      Si un prestataire externe est activé pour votre dossier, une redirection SignWell peut s’afficher avant la finalisation.
    </p>
  </div>
);
