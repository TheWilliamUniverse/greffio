import React from 'react';
import { BarChart3, Clock, FileCheck2, TrendingUp } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar.jsx';
import { useEffect, useState } from 'react';
import { listDossiers, getDossierById } from '@/api/dossiers.js';

export const AnalyticsPage = () => {
  const [dossiers, setDossiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const payload = await listDossiers();
        const items = Array.isArray(payload?.dossiers) ? payload.dossiers : [];
        const details = await Promise.all(items.map((item) => getDossierById(item.id)));
        if (!mounted) return;
        const nextDossiers = details.map((detail) => ({
          id: detail?.dossier?.id,
          name: detail?.dossier?.companyName || 'Dossier',
          expert: detail?.dossier?.assignedToUserId || 'Équipe Greffio',
          progress: Number(detail?.dossier?.progressPercent || 0),
          nextAction: 'Suivi opérationnel du dossier.',
        }));
        const nextDocuments = details.flatMap((detail) => detail?.documents || []);
        setDossiers(nextDossiers);
        setDocuments(nextDocuments.map((document) => ({
          status: String(document.status || '').toUpperCase(),
        })));
      } catch (_error) {
        if (!mounted) return;
        setDossiers([]);
        setDocuments([]);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);
  const completedDocs = documents.filter((document) => ['VALIDE', 'TERMINE'].includes(document.status)).length;
  const averageProgress = dossiers.length ? Math.round(dossiers.reduce((sum, dossier) => sum + (dossier.progress || 0), 0) / dossiers.length) : 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
        <div className="mx-auto max-w-7xl space-y-7">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Pilotage</p>
            <h1 className="mt-2 text-3xl font-extrabold">Vue opérationnelle</h1>
            <p className="mt-2 text-sm text-muted-foreground">Indicateurs calculés uniquement à partir de vos dossiers et documents enregistrés.</p>
          </div>

          <section className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Dossiers ouverts', value: dossiers.length, icon: BarChart3 },
              { label: 'Échéances', value: dossiers.length ? 'À suivre' : 'Aucune', icon: Clock },
              { label: 'Pièces validées', value: documents.length ? `${completedDocs}/${documents.length}` : '0', icon: FileCheck2 },
              { label: 'Avancement', value: `${averageProgress}%`, icon: TrendingUp },
            ].map((stat) => (
              <div key={stat.label} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <stat.icon className="mb-4 h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-extrabold">{stat.value}</p>
              </div>
            ))}
          </section>

          {dossiers.length === 0 ? (
            <section className="rounded-md border border-dashed border-primary/30 bg-white p-8 text-center shadow-elevation-sm">
              <BarChart3 className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-extrabold">Aucune donnée de pilotage</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Les graphiques et indicateurs apparaîtront uniquement lorsqu’un dossier réel sera ouvert. Aucun événement fictif n’est affiché dans l’espace client.
              </p>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-3">
              {dossiers.map((dossier) => (
                <div key={dossier.id} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <p className="text-sm font-bold text-muted-foreground">{dossier.expert}</p>
                  <h3 className="mt-2 font-extrabold">{dossier.name}</h3>
                  <div className="mt-5 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${dossier.progress || 0}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{dossier.nextAction}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
