import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { mapDossierStatusForBadge } from '@/utils/dossierClientStatus.js';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';

export const DossierActiveBanner = ({
  dossier,
  actionState,
  onChangeDossier,
  className = '',
}) => {
  if (!dossier?.id) return null;

  const progress = Number(dossier.progressPercent || 0);
  const continueUrl = actionState?.url || `/dossier/${dossier.id}`;
  const continueLabel = actionState?.label || 'Continuer le dossier';
  const phase = resolveFormalityPublicLabel({
    service: dossier.service,
    typeFormalite: dossier.typeFormalite,
    formeJuridique: dossier.legalForm || dossier.formeJuridique,
    legalForm: dossier.legalForm,
  });

  return (
    <section className={`rounded-md border border-primary/20 bg-gradient-to-r from-white to-secondary/40 p-5 shadow-elevation-sm ${className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase text-primary">
              <FolderKanban className="h-3.5 w-3.5" />
              Dossier actif
            </span>
            <StatusBadge status={mapDossierStatusForBadge(dossier.status)} />
          </div>
          <h2 className="mt-2 truncate text-2xl font-extrabold text-foreground">
            {dossier.companyName || dossier.denomination || 'Dossier entreprise'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {phase} · {dossier.legalForm || dossier.formeJuridique || 'Forme à préciser'}
          </p>
          {actionState?.description ? (
            <p className="mt-2 text-sm leading-6 text-foreground">{actionState.description}</p>
          ) : null}
          <div className="mt-3 max-w-md">
            <Progress value={progress} className="h-2" />
            <p className="mt-1 text-xs font-bold text-muted-foreground">{progress}% complété</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          {onChangeDossier ? (
            <Button type="button" variant="outline" className="bg-white" onClick={onChangeDossier}>
              Changer de dossier
              <ChevronDown className="h-4 w-4" />
            </Button>
          ) : null}
          <Button asChild>
            <Link to={continueUrl}>
              {continueLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
