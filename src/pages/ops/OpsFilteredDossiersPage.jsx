import React, { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { OpsCompletionBadge, OpsQueueBadge, OpsRiskBadge, OpsSlaBadge } from '@/components/ops/OpsBadges.jsx';
import { formatRelativeTime } from '@/components/ops/opsLabels.js';

export const OpsFilteredDossiersPage = ({
  title,
  description,
  filterFn,
  emptyMessage = 'Aucun dossier dans cette file pour le moment.',
}) => {
  const { cockpit } = useOutletContext();
  const items = useMemo(() => {
    const dossiers = cockpit?.dossiers || [];
    return dossiers.filter((item) => filterFn(item)).slice(0, 50);
  }, [cockpit?.dossiers, filterFn]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops</p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {items.length ? items.map((item) => (
          <Link
            key={item.id}
            to={`/ops/dossiers/${item.id}`}
            className="flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{item.companyName || 'Sans dénomination'}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.reference || item.id} · {formatRelativeTime(item.lastActivityAt)}
              </p>
              {item.nextBestAction?.label ? (
                <p className="mt-2 text-sm text-slate-700">{item.nextBestAction.label}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <OpsRiskBadge score={item.riskScore || 0} />
                <OpsSlaBadge status={item.slaStatus} label={item.slaLabel} />
                <OpsCompletionBadge score={item.completionScore || 0} />
                <OpsQueueBadge queue={item.opsQueue} />
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        )) : (
          <p className="px-5 py-10 text-sm text-slate-500">{emptyMessage}</p>
        )}
      </div>

      {items.length ? (
        <Button type="button" variant="outline" className="bg-white" asChild>
          <Link to="/ops/dossiers">Voir tous les dossiers</Link>
        </Button>
      ) : null}
    </div>
  );
};
