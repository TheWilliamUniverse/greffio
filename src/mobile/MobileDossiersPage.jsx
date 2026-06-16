import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FolderKanban, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { purgePlaceholderDossiers } from '@/api/dossiers.js';
import { isEphemeralPlaceholderDossier } from '@/utils/dossierBootstrap.js';
import { QUESTIONNAIRE_NEW_PATH } from '@/utils/questionnaireNavigation.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { loadDossiersSnapshot, cacheDossiersSnapshot } from '@/utils/mobileOffline.js';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobileAnimatedSection } from '@/mobile/ui/MobileAnimatedSection.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { MobileEmptyState } from '@/mobile/ui/MobileEmptyState.jsx';
import { useMobileMotion } from '@/mobile/ui/mobileMotion.js';
import { OfflineDataBanner } from '@/components/system/OfflineDataBanner.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';
import { mapDossierStatusForBadge } from '@/utils/dossierClientStatus.js';
import { dossierContinuePrefetchHandlers } from '@/utils/dossierPrefetch.js';

const toVisualStatus = (status) => mapDossierStatusForBadge(status);

export const MobileDossiersPage = () => {
  const { currentUser } = useAuth();
  const { staggerItem } = useMobileMotion();
  const [search, setSearch] = useState('');
  const [offlineSnapshot, setOfflineSnapshot] = useState(null);
  const { data, isLoading, isError, isSuccess, refetch, isFetching } = useDossiersQuery(currentUser?.id);

  useEffect(() => {
    if (!currentUser?.id) return;
    void loadDossiersSnapshot(currentUser.id).then(setOfflineSnapshot);
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id && isSuccess && data?.length) {
      void cacheDossiersSnapshot({ userId: currentUser.id, dossiers: data });
    }
  }, [currentUser?.id, data, isSuccess]);

  const dossiers = isError ? (offlineSnapshot?.dossiers || []) : (data || []);
  const cachedAt = isError ? offlineSnapshot?.cachedAt : null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dossiers;
    return dossiers.filter((item) => (
      String(item.companyName || item.denomination || '').toLowerCase().includes(query)
      || String(item.status || '').toLowerCase().includes(query)
    ));
  }, [dossiers, search]);

  const placeholderCount = useMemo(
    () => dossiers.filter((item) => isEphemeralPlaceholderDossier(item)).length,
    [dossiers],
  );

  if (isLoading && !offlineSnapshot?.dossiers?.length) return <MobilePageSkeleton />;

  return (
    <MobilePageContainer spacing="compact">
      <MobileAnimatedSection>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">Vos dossiers</h1>
            <p className="mt-1 text-sm text-muted-foreground">{dossiers.length} formalité{dossiers.length > 1 ? 's' : ''} suivie{dossiers.length > 1 ? 's' : ''}</p>
          </div>
          <Button asChild size="sm" className="h-11 shrink-0 rounded-2xl">
            <Link to={QUESTIONNAIRE_NEW_PATH}><Plus className="h-4 w-4" />Nouveau</Link>
          </Button>
        </div>
      </MobileAnimatedSection>

      {cachedAt ? <OfflineDataBanner cachedAt={cachedAt} /> : null}

      {placeholderCount > 0 ? (
        <MobileAnimatedSection delay={0.03}>
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-900">
            <p className="font-bold">{placeholderCount} brouillon{placeholderCount > 1 ? 's' : ''} vide{placeholderCount > 1 ? 's' : ''} (ex. « Projet Greffio »)</p>
            <p className="mt-1 leading-relaxed text-red-900/85">Ces dossiers non entamés peuvent être retirés sans impact sur vos formalités en cours.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-11 w-full rounded-2xl border-red-300 bg-white text-red-700"
              onClick={() => {
                void purgePlaceholderDossiers()
                  .then((result) => {
                    toast.success(result?.message || 'Brouillons supprimés.');
                    void refetch();
                  })
                  .catch(() => toast.error('Impossible de nettoyer les brouillons.'));
              }}
            >
              Nettoyer les brouillons vides
            </Button>
          </div>
        </MobileAnimatedSection>
      ) : null}

      <MobileAnimatedSection delay={0.04}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un dossier…"
            className="h-12 rounded-2xl pl-9 text-base"
          />
        </div>
      </MobileAnimatedSection>

      {isError && !dossiers.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Impossible de charger vos dossiers.
          <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-2xl bg-white" onClick={() => refetch()} disabled={isFetching}>
            Réessayer
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((dossier, index) => (
          <motion.div key={dossier.id} {...staggerItem(index)}>
            <Link
              to={`/dossier/${dossier.id}`}
              {...dossierContinuePrefetchHandlers(dossier)}
              className="block rounded-3xl border border-border/70 bg-white p-4 shadow-sm transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-foreground">
                    {dossier.companyName || dossier.denomination || 'Dossier entreprise'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {resolveFormalityPublicLabel({
                      service: dossier.service,
                      legalForm: dossier.legalForm || dossier.formeJuridique,
                    })}
                  </p>
                </div>
                <StatusBadge status={toVisualStatus(dossier.status)} />
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Progression</span>
                  <span>{Number(dossier.progressPercent || 0)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Number(dossier.progressPercent || 0)}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Ouvrir le dossier <ArrowRight className="h-4 w-4" />
              </p>
            </Link>
          </motion.div>
        ))}
      </div>

      {!filtered.length && !isError ? (
        <MobileAnimatedSection delay={0.08}>
          <MobileEmptyState
            icon={FolderKanban}
            title="Aucun dossier pour le moment"
            description="Vos formalités apparaîtront ici dès la création de votre première démarche."
            actionLabel="Commencer une simulation"
            actionTo="/simulateur"
          />
        </MobileAnimatedSection>
      ) : null}
    </MobilePageContainer>
  );
};
