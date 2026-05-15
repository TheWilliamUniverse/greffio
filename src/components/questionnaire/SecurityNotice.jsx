import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const SecurityNotice = () => (
  <div className="rounded-md border border-primary/20 bg-secondary p-4">
    <div className="flex items-start gap-3">
      <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <p className="text-sm font-bold text-foreground">Vos données sont en sécurité</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Elles sont utilisées uniquement pour préparer, déposer, suivre et régulariser votre formalité auprès des organismes compétents.
        </p>
      </div>
    </div>
  </div>
);
