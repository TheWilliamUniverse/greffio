import React from 'react';
import { ArrowRight, BadgeCheck, Building2, CheckCircle2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

const Row = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 border-b border-emerald-100/70 py-2 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">{label}</span>
    <span className="break-words text-sm font-semibold text-emerald-950 sm:text-right">{value || '–'}</span>
  </div>
);

const STATUS_LABEL = {
  A: 'Active',
  F: 'Cessée',
  C: 'Cessée',
};

export const CompanyLookupCard = ({
  company,
  onUse,
  className = '',
  title = 'Entreprise trouvée',
}) => {
  if (!company) return null;

  const statusLabel = STATUS_LABEL[String(company.administrativeStatus || '').toUpperCase()]
    || company.administrativeStatus
    || null;
  const isActive = String(company.administrativeStatus || '').toUpperCase() === 'A';

  return (
    <div
      className={`rounded-md border border-emerald-200 bg-white p-5 shadow-elevation-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{title}</p>
            <p className="mt-0.5 text-base font-extrabold text-emerald-950 sm:text-lg">
              {company.denomination || 'Entreprise'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {statusLabel || 'Active'}
            </span>
          ) : statusLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              {statusLabel}
            </span>
          ) : null}
          {company.siren ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              <BadgeCheck className="h-3.5 w-3.5" />
              SIREN vérifié
            </span>
          ) : null}
          {company.rcsGreffe ? (
            <span className="rounded-full bg-[hsl(var(--greffio-blue))]/10 px-2.5 py-1 text-[11px] font-bold text-[hsl(var(--greffio-blue))]">
              {company.rcsGreffe}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <Row label="SIREN" value={company.siren} />
        <Row label="SIRET du siège" value={company.siretSiege} />
        <Row label="Forme juridique" value={company.legalForm} />
        <Row label="Code APE / NAF" value={company.apeCode} />
        <Row label="Date de création" value={company.creationDate} />
        <Row label="État administratif" value={statusLabel || company.administrativeStatus} />
      </div>

      <div className="mt-4 rounded-md bg-emerald-50/70 px-3 py-2.5 text-sm">
        <div className="flex items-start gap-2 text-emerald-900">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words font-semibold leading-6">
            {company.addressSiege || 'Adresse non communiquée'}
          </p>
        </div>
      </div>

      {onUse ? (
        <Button
          type="button"
          onClick={onUse}
          className="mt-5 w-full justify-between bg-[hsl(var(--greffio-blue))] hover:bg-[hsl(var(--greffio-blue))]/92 sm:w-auto"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Utiliser ces informations
          </span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
};
