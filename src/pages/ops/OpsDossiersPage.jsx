import React, { useMemo } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { OpsCompletionBadge, OpsQueueBadge, OpsRiskBadge, OpsSlaBadge } from '@/components/ops/OpsBadges.jsx';
import { formatRelativeTime } from '@/components/ops/opsLabels.js';

const matchesFilter = (item, filter) => {
  if (!filter || filter === 'all') return true;
  if (filter === 'action:now') {
    return item.slaStatus === 'critical'
      || item.slaStatus === 'late'
      || item.riskScore >= 45
      || item.pendingDocuments > 0;
  }
  if (filter.startsWith('assignee:')) {
    const assignee = filter.split(':')[1];
    if (assignee === 'unassigned') return !item.assignedToUserId;
    return item.assignedToUserId === assignee;
  }
  if (filter.startsWith('sla:')) return item.slaStatus === filter.split(':')[1];
  if (filter.startsWith('queue:')) return item.opsQueue === filter.split(':')[1];
  if (filter === 'ready:deposit') return item.readyForDeposit;
  if (filter === 'risk:high') return item.riskScore >= 70;
  if (filter.startsWith('action:')) {
    const actionType = filter.split(':')[1];
    return item.nextBestAction?.type === actionType
      || (actionType === 'reminder' && ['reminder', 'missing_docs'].includes(item.nextBestAction?.type));
  }
  return true;
};

const quickFilters = [
  ['all', 'Tous'],
  ['action:now', 'À traiter'],
  ['sla:late', 'En retard'],
  ['queue:waiting_client', 'Attente client'],
  ['queue:ready_to_file', 'Prêt dépôt'],
  ['risk:high', 'Risque élevé'],
];

export const OpsDossiersPage = () => {
  const { cockpit } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get('filter') || 'all';
  const query = (searchParams.get('q') || '').trim().toLowerCase();

  const dossiers = useMemo(() => {
    const items = cockpit?.dossiers || [];
    return items
      .filter((item) => matchesFilter(item, activeFilter))
      .filter((item) => {
        if (!query) return true;
        const haystack = [item.companyName, item.reference, item.id, item.legalForm, item.status].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
  }, [cockpit?.dossiers, activeFilter, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {quickFilters.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={activeFilter === value ? 'default' : 'outline'}
              className={activeFilter === value ? '' : 'bg-white'}
              onClick={() => setSearchParams(value === 'all' ? {} : { filter: value })}
            >
              <Filter className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        <input
          type="search"
          value={searchParams.get('q') || ''}
          onChange={(event) => {
            const next = event.target.value;
            setSearchParams((current) => {
              const params = Object.fromEntries(current.entries());
              if (next) params.q = next;
              else delete params.q;
              return params;
            });
          }}
          placeholder="Filtrer par société, référence…"
          className="h-10 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-bold text-slate-600">Dossier</th>
                <th className="px-4 py-3 font-bold text-slate-600">Forme</th>
                <th className="px-4 py-3 font-bold text-slate-600">Statut</th>
                <th className="px-4 py-3 font-bold text-slate-600">File ops</th>
                <th className="px-4 py-3 font-bold text-slate-600">Risque / SLA</th>
                <th className="px-4 py-3 font-bold text-slate-600">Complétude</th>
                <th className="px-4 py-3 font-bold text-slate-600">Prochaine action</th>
                <th className="px-4 py-3 font-bold text-slate-600">Activité</th>
                <th className="px-4 py-3 font-bold text-slate-600" />
              </tr>
            </thead>
            <tbody>
              {dossiers.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{item.companyName || '–'}</p>
                    <p className="text-xs text-slate-500">{item.reference || item.id}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{item.legalForm || '–'}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <OpsQueueBadge queue={item.opsQueue} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <OpsRiskBadge score={item.riskScore || 0} />
                      <OpsSlaBadge status={item.slaStatus} label={item.slaLabel} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <OpsCompletionBadge score={item.completionScore || 0} />
                  </td>
                  <td className="px-4 py-4 max-w-[220px]">
                    <p className="line-clamp-2 text-slate-700">{item.nextBestAction?.label || '–'}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{formatRelativeTime(item.lastActivityAt)}</td>
                  <td className="px-4 py-4">
                    <Button type="button" variant="outline" className="bg-white" asChild>
                      <Link to={`/ops/dossiers/${item.id}`}>
                        Ouvrir
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!dossiers.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Aucun dossier pour ce filtre.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
