import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { OpsRiskBadge } from '@/components/ops/OpsBadges.jsx';

export const OpsQualitePage = () => {
  const { cockpit } = useOutletContext();
  const queue = useMemo(
    () => (cockpit?.antiRejectQueue || []).slice(0, 40),
    [cockpit?.antiRejectQueue],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops · Lot 2</p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Qualité & anti-rejet</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Classement par score de risque et recommandations de contrôle avant dépôt.
        </p>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {queue.length ? queue.map(({ dossier, risk, completionScore }) => (
          <Link
            key={dossier.id}
            to={`/ops/dossiers/${dossier.id}`}
            className="flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50"
          >
            <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{dossier.companyName || 'Sans dénomination'}</p>
              <p className="mt-1 text-sm text-slate-600">{risk?.recommendation || 'Revue qualité recommandée.'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <OpsRiskBadge score={risk?.riskScore || 0} />
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Complétude {completionScore || 0}%
                </span>
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        )) : (
          <p className="px-5 py-10 text-sm text-slate-500">Aucun dossier à risque élevé dans la file.</p>
        )}
      </div>
    </div>
  );
};
