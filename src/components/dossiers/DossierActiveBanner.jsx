import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { AnimatedProgressRing } from '@/components/ui/AnimatedProgressRing.jsx';
import { mapDossierStatusForBadge } from '@/utils/dossierClientStatus.js';
import { resolveDossierDashboardCta } from '@/utils/dossierDashboardCta.js';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';
import { greffioCardLift } from '@/motion/greffioMotion.js';
import { dossierContinuePrefetchHandlers } from '@/utils/dossierPrefetch.js';

export const DossierActiveBanner = ({
  dossier,
  actionState,
  onChangeDossier,
  className = '',
}) => {
  if (!dossier?.id) return null;

  const progress = Number(dossier.progressPercent || 0);
  const { url: continueUrl, label: continueLabel } = resolveDossierDashboardCta(dossier, actionState);
  const phase = resolveFormalityPublicLabel({
    service: dossier.service,
    typeFormalite: dossier.typeFormalite,
    formeJuridique: dossier.legalForm || dossier.formeJuridique,
    legalForm: dossier.legalForm,
  });

  return (
    <motion.section
      {...greffioCardLift}
      className={`rounded-md border border-primary/20 bg-gradient-to-r from-white to-secondary/40 p-5 shadow-elevation-sm ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
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
          <div className="mt-3 flex items-center gap-3">
            <AnimatedProgressRing value={progress} size={52} strokeWidth={4} />
            <p className="text-xs font-bold text-muted-foreground">{progress}% complété</p>
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
            <Link
              to={continueUrl}
              {...dossierContinuePrefetchHandlers(dossier)}
            >
              {continueLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
};
