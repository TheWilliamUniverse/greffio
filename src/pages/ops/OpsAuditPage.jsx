import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { getOpsDossiers } from '@/api/ops.js';
import { formatDateTime } from '@/components/ops/opsLabels.js';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';

export const OpsAuditPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const payload = await getOpsDossiers();
        const dossiers = payload?.dossiers || [];
        const sample = dossiers.slice(0, 12);
        const details = await Promise.all(
          sample.map(async (dossier) => {
            try {
              const { getOpsDossierDetail } = await import('@/api/ops.js');
              const detail = await getOpsDossierDetail(dossier.id);
              return (detail?.events || []).slice(0, 5).map((event) => ({
                ...event,
                dossierId: dossier.id,
                companyName: dossier.companyName,
              }));
            } catch (_error) {
              return [];
            }
          }),
        );
        if (!mounted) return;
        setEvents(details.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 40));
      } catch (_error) {
        if (!mounted) return;
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops · Lot 3</p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Audit ops</h2>
        <p className="mt-2 text-sm text-slate-600">Journal récent des transitions et actions sur les dossiers actifs.</p>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <PageLoadingState compact className="px-5 py-10" label="Chargement du journal…" />
        ) : events.length ? events.map((event) => (
          <div key={event.id} className="flex gap-3 px-5 py-4">
            <CalendarClock className="mt-0.5 h-4 w-4 text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {event.toStatus || event.reason || 'Événement dossier'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {event.companyName} · {event.actorType} · {formatDateTime(event.createdAt)}
              </p>
              <Link to={`/ops/dossiers/${event.dossierId}`} className="mt-2 inline-block text-xs font-bold text-primary">
                Ouvrir la fiche
              </Link>
            </div>
          </div>
        )) : (
          <p className="px-5 py-10 text-sm text-slate-500">Aucun événement récent.</p>
        )}
      </div>
    </div>
  );
};
