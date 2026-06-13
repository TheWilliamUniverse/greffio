import React from 'react';
import { ShieldCheck } from 'lucide-react';

const FIELD_LABELS = {
  companyName: 'Société',
  denomination: 'Dénomination',
  mandataire: 'Mandataire',
  greffe: 'Greffe compétent',
  signatoryName: 'Signataire',
  signatoryQuality: 'Qualité du signataire',
  signaturePlace: 'Lieu de signature',
  signatureDate: 'Date de signature',
};

export const FormalityPowerSummary = ({ document, fields = {} }) => {
  const metadata = Object.entries(FIELD_LABELS)
    .map(([key, label]) => {
      const value = fields[key] || document?.[key] || document?.metadata?.[key];
      return value ? { label, value: String(value) } : null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Pourquoi ce pouvoir est important ?
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ce document peut autoriser Greffio ou son mandataire à accomplir les démarches mentionnées :
          dépôt du dossier, échanges avec le greffe, publication légale, correction ou régularisation.
          Sa portée dépend de son contenu, de sa signature et des exigences du greffe ou de l’administration.
        </p>
      </div>

      {metadata.length ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {metadata.map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          Les informations détaillées du pouvoir seront affichées dès qu’elles seront disponibles dans le dossier.
        </p>
      )}
    </div>
  );
};
