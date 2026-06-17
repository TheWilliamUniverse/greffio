import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  Plug,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { getOpsInvoicesPendingReview } from '@/api/ops.js';

const ACTION_BUCKETS = [
  { id: 'urgent', label: 'Urgent', tone: 'text-red-700 bg-red-50 border-red-100' },
  { id: 'todo', label: 'À traiter', tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  { id: 'waiting', label: 'En attente', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
  { id: 'done', label: 'Résolu', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
];

const COMMAND_ACTIONS = [
  { to: '/ops/dossiers?filter=action:now', label: 'Alertes dossiers', icon: Bell },
  { to: '/ops/dossiers', label: 'Clients & dossiers', icon: Users },
  { to: '/ops/invoices', label: 'Factures en attente', icon: FileText },
  { to: '/ops/integrations', label: 'Intégrations Mollie', icon: Plug },
  { to: '/ops/audit', label: 'Journal ops', icon: ShieldCheck },
];

export const OpsCockpitHome = () => {
  const { cockpit, refreshing } = useOutletContext();
  const navigate = useNavigate();
  const [pendingInvoices, setPendingInvoices] = useState([]);

  useEffect(() => {
    void getOpsInvoicesPendingReview()
      .then((payload) => setPendingInvoices(payload?.invoices || []))
      .catch(() => setPendingInvoices([]));
  }, []);

  const kpis = cockpit?.kpis || {};
  const actionNow = cockpit?.actionNow || [];

  const systemStatus = useMemo(() => {
    const alerts = Number(kpis.highRisk || 0) + Number(kpis.storageUploadFailures || 0);
    if (alerts > 0) {
      return {
        label: 'Alertes actives',
        detail: `${alerts} point(s) nécessitent votre attention.`,
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
      };
    }
    return {
      label: 'Système stable',
      detail: 'Synchronisation ops active, aucune alerte critique.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
  }, [kpis.highRisk, kpis.storageUploadFailures]);

  const bucketItems = useMemo(() => ({
    urgent: actionNow.filter((item) => item.sla?.status === 'late' || item.risk?.riskScore >= 70).slice(0, 4),
    todo: actionNow.filter((item) => item.sla?.status !== 'late' && item.risk?.riskScore < 70).slice(0, 4),
    waiting: pendingInvoices.slice(0, 4).map((invoice) => ({
      id: invoice.id,
      label: invoice.customerName || invoice.customerEmail || 'Facture en attente',
      meta: invoice.invoiceNumber ? `N° ${invoice.invoiceNumber}` : 'Validation ops',
      href: '/ops/invoices',
    })),
    done: actionNow.length ? [] : [{ id: 'clear', label: 'Aucune action urgente', meta: 'File vide', href: '/ops/dossiers' }],
  }), [actionNow, pendingInvoices]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className={`rounded-2xl border px-5 py-4 ${systemStatus.tone}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">État système</p>
            <h2 className="mt-1 text-xl font-extrabold">{systemStatus.label}</h2>
            <p className="mt-1 text-sm opacity-90">{systemStatus.detail}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-white/70 px-3 py-1">{kpis.activeDossiers ?? 0} dossiers actifs</span>
            <span className="rounded-full bg-white/70 px-3 py-1">{pendingInvoices.length} factures en attente</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {ACTION_BUCKETS.map((bucket) => (
          <div key={bucket.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`border-b px-5 py-4 ${bucket.tone}`}>
              <h3 className="text-base font-extrabold">File d’actions · {bucket.label}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {refreshing && !bucketItems[bucket.id]?.length ? (
                <PageLoadingState compact className="px-5 py-8" label="Chargement…" />
              ) : bucketItems[bucket.id]?.length ? bucketItems[bucket.id].map((item) => (
                <button
                  key={item.id || item.dossier?.id}
                  type="button"
                  onClick={() => navigate(item.href || `/ops/dossiers/${item.dossier?.id}`)}
                  className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.label || item.dossier?.companyName || 'Dossier'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.meta || item.nextBestAction?.label || item.dossier?.reference}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                </button>
              )) : (
                <p className="px-5 py-8 text-sm text-slate-500">Rien dans cette file pour le moment.</p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Command Center</h3>
            <p className="text-sm text-slate-500">Accès rapide aux zones ops essentielles.</p>
          </div>
          <Button asChild variant="outline" className="bg-white">
            <Link to="/ops/cockpit">Vue détaillée</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COMMAND_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-4 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <action.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-slate-800">{action.label}</span>
            </Link>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase text-slate-500">Docs à valider</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{kpis.documentsToValidate ?? 0}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase text-slate-500">Retard / critique</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{kpis.lateDossiers ?? 0}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase text-slate-500">Prêts au dépôt</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{kpis.readyForDeposit ?? 0}</p>
          </div>
        </div>
        {Number(kpis.highRisk || 0) > 0 ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {kpis.highRisk} dossier(s) à risque élevé
          </p>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aucune alerte critique immédiate
          </p>
        )}
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          Dernière synchronisation cockpit {refreshing ? 'en cours…' : 'à jour'}
        </p>
        <p className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
          <FolderKanban className="h-3.5 w-3.5" />
          {kpis.activeDossiers ?? 0} dossiers suivis dans le cockpit
        </p>
      </section>
    </div>
  );
};
