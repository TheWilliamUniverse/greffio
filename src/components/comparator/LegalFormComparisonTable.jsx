import React from 'react';
import { COMPARATOR_FORM_ORDER, LEGAL_FORM_COMPARATOR_FORMS } from '@/config/legalFormComparator.js';
import { getFormAvailability, SERVICE_AVAILABILITY } from '@/config/catalog.js';
import { AVAILABILITY_LABELS } from '@/config/legalFormComparator.js';

const associatesLabel = (form) => {
  if (form.minAssociates === 1 && form.maxAssociates === 1) return '1';
  if (form.maxAssociates) return `${form.minAssociates} à ${form.maxAssociates}`;
  return `${form.minAssociates}+`;
};

const availabilityLabel = (key) => {
  const availability = getFormAvailability(key);
  if (availability === SERVICE_AVAILABILITY.AVAILABLE_NOW) return AVAILABILITY_LABELS.available_now;
  if (availability === SERVICE_AVAILABILITY.COMING_SOON) return AVAILABILITY_LABELS.coming_soon;
  return AVAILABILITY_LABELS.manual_quote;
};

export const LegalFormComparisonTable = () => (
  <section id="comparateur-tableau" className="scroll-mt-24">
    <div className="mb-4 max-w-2xl">
      <p className="text-sm font-bold uppercase text-primary">Tableau comparatif</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
        Synthèse des principales formes
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Vue d’ensemble indicative. Le choix doit être confirmé selon votre situation.
      </p>
    </div>
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-elevation-sm">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="p-3 font-bold">Forme</th>
            <th className="p-3 font-bold">Associés</th>
            <th className="p-3 font-bold">Responsabilité</th>
            <th className="p-3 font-bold">Fiscalité</th>
            <th className="p-3 font-bold">Social dirigeant</th>
            <th className="p-3 font-bold">Complexité</th>
            <th className="p-3 font-bold">Levée de fonds</th>
            <th className="p-3 font-bold">Greffio</th>
          </tr>
        </thead>
        <tbody>
          {COMPARATOR_FORM_ORDER.map((formKey) => {
            const form = LEGAL_FORM_COMPARATOR_FORMS[formKey];
            if (!form) return null;
            return (
              <tr key={formKey} className="border-b border-border/70 last:border-0">
                <td className="p-3 align-top">
                  <span className="font-bold text-foreground">{form.label}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{form.shortPitch}</p>
                </td>
                <td className="p-3 align-top text-muted-foreground">{associatesLabel(form)}</td>
                <td className="p-3 align-top text-muted-foreground">{form.liability}</td>
                <td className="p-3 align-top text-muted-foreground">{form.taxDefault}</td>
                <td className="p-3 align-top text-muted-foreground">{form.social}</td>
                <td className="p-3 align-top text-muted-foreground">{form.complexity}/5</td>
                <td className="p-3 align-top text-muted-foreground">{form.fundraising}</td>
                <td className="p-3 align-top text-xs font-semibold text-primary">
                  {availabilityLabel(form.availabilityKey)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);
