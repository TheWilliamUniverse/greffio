import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { GREFFIO_COMPANY } from '@/config/opsTeam.js';
import { getOpsTeamWorkload } from '@/api/ops.js';

export const OpsEquipePage = () => {
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const payload = await getOpsTeamWorkload();
        if (mounted) setWorkload(payload);
      } catch (_error) {
        if (mounted) setWorkload(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const members = workload?.members || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops · Lot 4</p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Équipe & charge de travail</h2>
        <p className="mt-2 text-sm text-slate-600">
          Répartition des dossiers assignés, accès rapide aux fiches et contacts de l&apos;équipe Greffio.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Dossiers actifs</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{loading ? '…' : workload?.totalDossiers ?? 0}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Non assignés</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{loading ? '…' : workload?.unassignedCount ?? 0}</p>
          {!loading && workload?.unassignedCount > 0 ? (
            <Button asChild variant="outline" size="sm" className="mt-3 bg-white">
              <Link to="/ops/dossiers?filter=assignee:unassigned">Voir la file</Link>
            </Button>
          ) : null}
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Formalistes</p>
          <p className="mt-2 flex items-center gap-2 text-3xl font-extrabold text-slate-900">
            <Users className="h-7 w-7 text-slate-500" />
            {members.length}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Société éditrice</p>
        <h3 className="mt-2 text-xl font-extrabold text-slate-900">{GREFFIO_COMPANY.name}</h3>
        <a href={`mailto:${GREFFIO_COMPANY.email}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
          <Mail className="h-4 w-4" />
          {GREFFIO_COMPANY.email}
        </a>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <p className="col-span-full px-2 py-8 text-sm text-slate-500">Chargement de la charge équipe…</p>
        ) : members.map((member) => (
          <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {member.initials}
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900">{member.name}</h3>
            <p className="text-sm text-slate-500">{member.title}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{member.role}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-lg font-extrabold text-slate-900">{member.assignedCount}</p>
                <p className="text-[11px] font-semibold text-slate-500">Assignés</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-lg font-extrabold text-slate-900">{member.pendingReview}</p>
                <p className="text-[11px] font-semibold text-slate-500">À traiter</p>
              </div>
            </div>
            {member.userId ? (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full bg-white">
                <Link to={`/ops/dossiers?filter=assignee:${member.userId}`}>
                  <FolderKanban className="h-4 w-4" />
                  Voir ses dossiers
                </Link>
              </Button>
            ) : (
              <p className="mt-4 text-xs text-amber-700">Compte Greffio non lié ({member.email})</p>
            )}
            {member.recentDossiers?.length ? (
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {member.recentDossiers.map((dossier) => (
                  <li key={dossier.id}>
                    <Link to={`/ops/dossiers/${dossier.id}`} className="text-sm font-semibold text-primary hover:underline">
                      {dossier.companyName || dossier.reference || dossier.id}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <a href={`mailto:${member.email}`} className="mt-3 block text-sm font-semibold text-slate-700 hover:text-slate-900">
              {member.email}
            </a>
          </article>
        ))}
      </section>
    </div>
  );
};
