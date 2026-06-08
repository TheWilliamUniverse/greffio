import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';
import { BarChart3, Clock, FileCheck2, FolderKanban, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { listDossiers, getDossierById } from '@/api/dossiers.js';

export const MobileAnalyticsPage = () => {
  const [dossiers, setDossiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const payload = await listDossiers();
        const items = Array.isArray(payload?.dossiers) ? payload.dossiers : [];
        const details = await Promise.all(items.map((item) => getDossierById(item.id)));
        if (!mounted) return;
        setDossiers(details.map((detail) => ({
          id: detail?.dossier?.id,
          name: detail?.dossier?.companyName || 'Dossier',
          progress: Number(detail?.dossier?.progressPercent || 0),
          status: detail?.dossier?.status || 'En cours',
        })));
        setDocuments(details.flatMap((detail) => detail?.documents || []).map((document) => ({
          status: String(document.status || '').toUpperCase(),
        })));
      } catch (_error) {
        if (!mounted) return;
        setDossiers([]);
        setDocuments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const completedDocs = documents.filter((document) => ['VALIDE', 'VALID', 'VALIDATED', 'TERMINE'].includes(document.status)).length;
  const averageProgress = dossiers.length
    ? Math.round(dossiers.reduce((sum, dossier) => sum + (dossier.progress || 0), 0) / dossiers.length)
    : 0;

  if (loading) return <MobilePageSkeleton />;

  const stats = [
    { label: 'Dossiers ouverts', value: dossiers.length, icon: BarChart3 },
    { label: 'Échéances', value: dossiers.length ? 'À suivre' : 'Aucune', icon: Clock },
    { label: 'Pièces validées', value: documents.length ? `${completedDocs}/${documents.length}` : '0', icon: FileCheck2 },
    { label: 'Avancement moyen', value: `${averageProgress}%`, icon: TrendingUp },
  ];

  return (
    <MobilePageContainer>
      <MobileAnimatedSection delay={0}>
        <p className="text-xs font-bold uppercase tracking-wide text-primary/80">Pilotage</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">
          Vue opérationnelle
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Indicateurs calculés à partir de vos dossiers et documents réels.
        </p>
      </MobileAnimatedSection>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/70 bg-white p-4 shadow-elevation-sm">
            <stat.icon className="mb-2 h-5 w-5 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{stat.value}</p>
          </div>
        ))}
      </div>

      {dossiers.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-primary/30 bg-white p-6 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-lg font-extrabold">Aucune donnée de pilotage</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Les indicateurs apparaîtront lorsqu’un dossier sera ouvert.
          </p>
          <Button asChild className="mt-4 rounded-2xl">
            <Link to={QUESTIONNAIRE_NEW_PATH}>Nouvelle démarche</Link>
          </Button>
        </section>
      ) : (
        <ul className="space-y-3">
          {dossiers.map((dossier) => (
            <li key={dossier.id}>
              <Link
                to={`/dossier/${dossier.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-4 shadow-elevation-sm"
              >
                <FolderKanban className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{dossier.name}</span>
                  <span className="block text-xs text-muted-foreground">{dossier.status} · {dossier.progress}%</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MobilePageContainer>
  );
};
