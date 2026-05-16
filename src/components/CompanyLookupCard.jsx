import React from 'react';
import { Building2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export const CompanyLookupCard = ({
  company,
  onUse,
  className = '',
  title = 'Entreprise trouvée',
}) => {
  if (!company) return null;

  return (
    <div className={`rounded-md border border-emerald-200 bg-emerald-50 p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-emerald-700" />
        <p className="font-bold text-emerald-900">{title}</p>
      </div>
      <div className="grid gap-1 text-xs text-emerald-900/90 md:grid-cols-2">
        <p><strong>Dénomination:</strong> {company.denomination || 'N/A'}</p>
        <p><strong>SIREN:</strong> {company.siren || 'N/A'}</p>
        <p><strong>SIRET du siège:</strong> {company.siretSiege || 'N/A'}</p>
        <p><strong>Forme juridique:</strong> {company.legalForm || 'N/A'}</p>
        <p><strong>Adresse du siège:</strong> {company.addressSiege || 'N/A'}</p>
        <p><strong>Code APE/NAF:</strong> {company.apeCode || 'N/A'}</p>
        <p><strong>Date de création:</strong> {company.creationDate || 'N/A'}</p>
        <p><strong>État administratif:</strong> {company.administrativeStatus || 'N/A'}</p>
        <p><strong>RCS / Greffe:</strong> {company.rcsGreffe || 'N/A'}</p>
      </div>
      {onUse ? (
        <Button type="button" className="mt-3" onClick={onUse}>
          <CheckCircle2 className="h-4 w-4" />
          Utiliser ces informations
        </Button>
      ) : null}
    </div>
  );
};
