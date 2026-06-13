import React from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FolderKanban,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { OpsKpiCard } from '@/components/ops/OpsKpiCard.jsx';
import { OpsCompletionBadge, OpsRiskBadge, OpsSlaBadge } from '@/components/ops/OpsBadges.jsx';
import { formatRelativeTime } from '@/components/ops/opsLabels.js';
import { GREFFIO_COMPANY } from '@/config/opsTeam.js';

export const OpsCockpitPage = () => {
  const { cockpit, refreshing } = useOutletContext();
  const navigate = useNavigate();
  const kpis = cockpit?.kpis || {};
  const actionNow = cockpit?.actionNow || [];
  const priorityCards = cockpit?.priorityCards || [];

  const goFilter = (filter) => {
    navigate(`/ops/dossiers?filter=${encodeURIComponent(filter)}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OpsKpiCard title="Dossiers actifs" value={kpis.activeDossiers ?? '–'} icon={FolderKanban} tone="info" />
        <OpsKpiCard title="Docs à valider" value={kpis.documentsToValidate ?? '–'} icon={FileCheck2} tone="warning" />
        <OpsKpiCard title="En retard / critique" value={kpis.lateDossiers ?? '–'} icon={Clock3} tone="danger" onClick={() => goFilter('sla:late')} active={false} />
        <OpsKpiCard title="Prêts au dépôt" value={kpis.readyForDeposit ?? '–'} icon={CheckCircle2} tone="success" onClick={() => goFilter('ready:deposit')} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <OpsKpiCard title="Risque élevé" value={kpis.highRisk ?? '–'} hint="Score ≥ 70/100" icon={ShieldAlert} tone="danger" onClick={() => goFilter('risk:high')} />
        <OpsKpiCard title="Relances suggérées" value={kpis.remindersSuggested ?? '–'} icon={AlertTriangle} tone="warning" onClick={() => goFilter('action:reminder')} />
        <OpsKpiCard title="Bloqués > 48 h" value={kpis.blockedOver48h ?? '–'} icon={Clock3} tone="danger" onClick={() => goFilter('sla:late')} />
        <OpsKpiCard title="Uploads S3 échoués" value={kpis.storageUploadFailures ?? '–'} icon={FileCheck2} tone="warning" onClick={() => goFilter('storage:failed')} />
        <OpsKpiCard title="Brouillons fantômes" value={kpis.placeholderDossiers ?? '–'} icon={FolderKanban} tone="warning" onClick={() => goFilter('placeholder:ghost')} />
        <OpsKpiCard title="Complétude moyenne" value={`${kpis.averageCompletion ?? 0}%`} icon={CheckCircle2} tone="success" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">À traiter maintenant</h2>
              <p className="text-sm text-slate-500">Priorisation anti-rejet – SLA, risque et documents en attente.</p>
            </div>
            <Button type="button" variant="outline" className="bg-white" asChild>
              <Link to="/ops/dossiers?filter=action:now">Voir tout</Link>
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {refreshing && !actionNow.length ? (
              <PageLoadingState compact className="px-5 py-8" label="Chargement du cockpit…" />
            ) : actionNow.length ? actionNow.map((item) => (
              <button
                key={item.dossier.id}
                type="button"
                onClick={() => navigate(`/ops/dossiers/${item.dossier.id}`)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{item.dossier.companyName || 'Sans dénomination'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.dossier.reference || item.dossier.id} · {formatRelativeTime(item.lastActivityAt)}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">{item.nextBestAction?.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <OpsRiskBadge score={item.risk.riskScore} />
                    <OpsSlaBadge status={item.sla.status} label={item.sla.label} />
                    <OpsCompletionBadge score={item.completionScore} />
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </button>
            )) : (
              <p className="px-5 py-8 text-sm text-slate-500">Aucune action urgente – excellente nouvelle.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">Vues rapides</h2>
            <div className="mt-4 grid gap-3">
              {priorityCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => goFilter(card.filter)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <span className="text-sm font-semibold text-slate-800">{card.label}</span>
                  <span className="text-xl font-extrabold text-slate-900">{card.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Équipe Greffio</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              William, Nobatène et Ibtissam ABDOU pilotent les formalités pour {GREFFIO_COMPANY.name}.
              Contact société : contact@willentreprises.com
            </p>
            <Button type="button" variant="secondary" className="mt-4 bg-white text-slate-900 hover:bg-slate-100" asChild>
              <Link to="/ops/equipe">Voir l’équipe</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
