import React from 'react';
import { MERGED_FORMALITY_POWER_INFO } from '@/utils/formalityPowerDocuments.js';

const FIELD_LABELS = {
  companyName: 'Société',
  denomination: 'Dénomination',
  mandataire: 'Mandataire',
  greffe: 'Greffe',
  signatoryName: 'Signataire',
  signatoryQuality: 'Qualité',
  signaturePlace: 'Lieu',
  signatureDate: 'Date',
};

export const FormalityPowerSummary = ({ document, fields = {} }) => {
  const metadata = Object.entries(FIELD_LABELS)
    .map(([key, label]) => {
      const value = fields[key] || document?.[key] || document?.metadata?.[key]
        || document?.metadata?.fields?.[key];
      return value ? { label, value: String(value) } : null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-muted-foreground">
        {MERGED_FORMALITY_POWER_INFO}
      </p>

      {metadata.length ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {metadata.map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
};
