import React from 'react';
import { PenLine } from 'lucide-react';

/** Rappel UX : signature électronique Greffio (parcours interne). */
export const GreffioSignatureInfoBanner = ({ className = '' }) => (
  <div
    className={`flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground ${className}`}
  >
    <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
    <p>
      <span className="font-semibold text-foreground">Signature Greffio</span>
      {' – '}
      Consultez l’aperçu du document, confirmez votre identité et signez directement dans Greffio.
      Le document signé et la preuve sont enregistrés dans votre dossier.
    </p>
  </div>
);
