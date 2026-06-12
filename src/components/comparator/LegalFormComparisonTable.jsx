import React from 'react';
import {
  COMPARATOR_FORM_ORDER,
  LEGAL_FORM_COMPARATOR_FORMS,
  LEGAL_FORM_IDEAL_FOR,
  LEGAL_FORM_FEATURE_BADGES,
} from '@/config/legalFormComparator.js';
import { getFormAvailability } from '@/config/catalog.js';
import { AvailabilityBadge, LegalFormBadge } from '@/components/comparator/LegalFormBadge.jsx';

const associatesLabel = (form) => {
  if (form.minAssociates === 1 && form.maxAssociates === 1) return '1';
  if (form.maxAssociates) return `${form.minAssociates} à ${form.maxAssociates}`;
  return `${form.minAssociates}+`;
};

const ComplexityDots = ({ level }) => (
  <span className="inline-flex items-center gap-1" aria-label={`Complexité ${level} sur 5`}>
    {[1, 2, 3, 4, 5].map((dot) => (
      <span
        key={dot}
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${dot <= level ? 'bg-primary' : 'bg-[#e3ebf7]'}`}
      />
    ))}
  </span>
);

const DesktopTable = () => (
  <div className="hidden overflow-hidden rounded-xl border border-border bg-white shadow-elevation-sm md:block">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="p-3.5 font-bold">Forme</th>
            <th scope="col" className="p-3.5 font-bold">Idéal pour</th>
            <th scope="col" className="p-3.5 font-bold">Associés</th>
            <th scope="col" className="p-3.5 font-bold">Responsabilité</th>
            <th scope="col" className="p-3.5 font-bold">Fiscalité indicative</th>
            <th scope="col" className="p-3.5 font-bold">Social dirigeant</th>
            <th scope="col" className="p-3.5 font-bold">Complexité</th>
            <th scope="col" className="p-3.5 font-bold">Greffio</th>
          </tr>
        </thead>
        <tbody>
          {COMPARATOR_FORM_ORDER.map((formKey) => {
            const form = LEGAL_FORM_COMPARATOR_FORMS[formKey];
            if (!form) return null;
            return (
              <tr key={formKey} className="border-b border-border/70 align-top transition-colors last:border-0 hover:bg-muted/25">
                <td className="p-3.5">
                  <span className="font-extrabold text-[hsl(var(--greffio-blue-900))]">{form.label}</span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(LEGAL_FORM_FEATURE_BADGES[formKey] || []).map((badge) => (
                      <LegalFormBadge key={badge} tone="blue">{badge}</LegalFormBadge>
                    ))}
                  </div>
                </td>
                <td className="p-3.5 text-muted-foreground">{LEGAL_FORM_IDEAL_FOR[formKey]}</td>
                <td className="p-3.5 text-muted-foreground">{associatesLabel(form)}</td>
                <td className="p-3.5 text-muted-foreground">{form.liability}</td>
                <td className="p-3.5 text-muted-foreground">{form.taxDefault}</td>
                <td className="p-3.5 text-muted-foreground">{form.social}</td>
                <td className="p-3.5"><ComplexityDots level={form.complexity} /></td>
                <td className="p-3.5">
                  <AvailabilityBadge availability={getFormAvailability(form.availabilityKey)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const MobileCards = () => (
  <div className="grid min-w-0 gap-3 md:hidden">
    {COMPARATOR_FORM_ORDER.map((formKey) => {
      const form = LEGAL_FORM_COMPARATOR_FORMS[formKey];
      if (!form) return null;
      return (
        <article key={formKey} className="min-w-0 rounded-xl border border-border bg-white p-4 shadow-elevation-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">{form.label}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{LEGAL_FORM_IDEAL_FOR[formKey]}</p>
            </div>
            <AvailabilityBadge availability={getFormAvailability(form.availabilityKey)} />
          </div>
          {(LEGAL_FORM_FEATURE_BADGES[formKey] || []).length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {LEGAL_FORM_FEATURE_BADGES[formKey].map((badge) => (
                <LegalFormBadge key={badge} tone="blue">{badge}</LegalFormBadge>
              ))}
            </div>
          ) : null}
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 font-semibold text-foreground">Associés</dt>
              <dd className="text-right text-muted-foreground">{associatesLabel(form)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Responsabilité</dt>
              <dd className="mt-0.5 leading-5 text-muted-foreground">{form.liability}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Fiscalité indicative</dt>
              <dd className="mt-0.5 leading-5 text-muted-foreground">{form.taxDefault}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Social dirigeant</dt>
              <dd className="mt-0.5 leading-5 text-muted-foreground">{form.social}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-foreground">Complexité</dt>
              <dd><ComplexityDots level={form.complexity} /></dd>
            </div>
          </dl>
        </article>
      );
    })}
  </div>
);

export const LegalFormComparisonTable = () => (
  <section id="comparateur-tableau" className="min-w-0 scroll-mt-24">
    <div className="mb-5 max-w-2xl">
      <p className="text-sm font-bold uppercase tracking-wide text-primary">Tableau comparatif</p>
      <h2 className="mt-2 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
        Synthèse des principales formes
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Vue d’ensemble indicative. Le choix doit être confirmé selon votre situation.
      </p>
    </div>
    <DesktopTable />
    <MobileCards />
  </section>
);
