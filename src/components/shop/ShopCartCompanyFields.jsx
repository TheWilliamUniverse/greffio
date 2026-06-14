import React, { useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { sanitizeCompanyIdentifier, useCompanySirenLookup } from '@/hooks/useCompanySirenLookup.js';

export const ShopCartCompanyFields = ({
  lineId,
  siren = '',
  companyName = '',
  requiresSiren = true,
  requiresCompany = true,
  onUpdate,
}) => {
  const { state, company } = useCompanySirenLookup(siren, { enabled: requiresSiren });

  useEffect(() => {
    if (!requiresCompany || !company?.denomination) return;
    if (companyName === company.denomination) return;
    onUpdate(lineId, { companyName: company.denomination });
  }, [company?.denomination, companyName, lineId, onUpdate, requiresCompany]);

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {requiresSiren ? (
        <label className="block text-xs">
          SIREN ou SIRET
          <input
            className="mt-1 h-9 w-full rounded-md border border-input px-3 text-sm"
            value={siren}
            onChange={(event) => onUpdate(lineId, { siren: sanitizeCompanyIdentifier(event.target.value) })}
            placeholder="123456789"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
          />
        </label>
      ) : null}
      {requiresSiren && state === 'loading' ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Recherche de l’entreprise…
        </p>
      ) : null}
      {requiresSiren && state === 'found' && company ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-bold">{company.denomination}</span>
            {company.city ? ` – ${company.city}` : ''}
          </span>
        </div>
      ) : null}
      {requiresSiren && state === 'notfound' && sanitizeCompanyIdentifier(siren).length >= 9 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Entreprise introuvable. Vérifiez le SIREN/SIRET ou saisissez la dénomination manuellement.
        </p>
      ) : null}
      {requiresCompany ? (
        <label className="block text-xs">
          Nom de l&apos;entreprise
          <input
            className="mt-1 h-9 w-full rounded-md border border-input px-3 text-sm"
            value={companyName}
            onChange={(event) => onUpdate(lineId, { companyName: event.target.value })}
            placeholder="Dénomination sociale"
          />
        </label>
      ) : null}
    </div>
  );
};
