import React from 'react';
import { Clock3, ShieldCheck } from 'lucide-react';
import { resolveDossierStatusSummary } from '@/utils/dossierClientStatus.js';

export const MobileDossierStatusCard = ({ dossier, documents = [] }) => {
  const summary = resolveDossierStatusSummary(dossier, documents);
  const lastUpdateLabel = summary.lastUpdate
    ? new Date(summary.lastUpdate).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
    : 'récemment';

  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-white via-secondary/25 to-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-primary/80">État du dossier</p>
      <div className="mt-3 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Étape actuelle</p>
          <p className="mt-0.5 text-base font-extrabold text-foreground">{summary.currentStep}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Action requise</p>
          <p className="mt-0.5 text-sm leading-6 text-foreground">{summary.actionRequired}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/70 px-2.5 py-1 font-semibold text-[hsl(var(--greffio-blue-900))]">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {summary.blocking}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            {summary.estimatedDelay}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Dernière mise à jour : {lastUpdateLabel}
          {' · '}
          Prochaine étape : <span className="font-semibold text-foreground">{summary.nextStep}</span>
        </p>
      </div>
    </section>
  );
};
