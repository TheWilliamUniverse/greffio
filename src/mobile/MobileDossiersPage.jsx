import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { loadDossiersSnapshot, cacheDossiersSnapshot } from '@/utils/mobileOffline.js';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { OfflineDataBanner } from '@/components/system/OfflineDataBanner.jsx';
import { StatusBadge } from '@/components/StatusBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { resolveFormalityPublicLabel } from '@/config/formalityLabels.js';

const toVisualStatus = (status) => String(status || 'draft').toUpperCase();

export const MobileDossiersPage = () => {
  const { currentUser } = useAuth();
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

  if (isLoading && !offlineSnapshot?.dossiers?.length) return <MobilePageSkeleton />;

  return (
    <div className="space-y-4 px-4 py-5 pb-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">Vos dossiers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dossiers.length} formalité{dossiers.length > 1 ? 's' : ''} suivie{dossiers.length > 1 ? 's' : ''}</p>
        </div>
        <Button asChild size="sm" className="h-10 shrink-0">
          <Link to="/questionnaire"><Plus className="h-4 w-4" />Nouveau</Link>
        </Button>
      </div>

      {cachedAt ? <OfflineDataBanner cachedAt={cachedAt} /> : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un dossier…"
          className="h-12 pl-9 text-base md:h-10 md:text-sm"
        />
      </div>

      {isError && !dossiers.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Impossible de charger vos dossiers.
          <Button type="button" variant="outline" className="mt-3 h-10 w-full bg-white" onClick={() => refetch()} disabled={isFetching}>
            Réessayer
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {filtered.map((dossier) => (
          <Link
            key={dossier.id}
            to={`/dossier/${dossier.id}`}
            className="block rounded-2xl border border-border/70 bg-white p-4 shadow-sm transition active:scale-[0.99]"
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
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Number(dossier.progressPercent || 0)}%` }} />
              </div>
            </div>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Ouvrir le dossier <ArrowRight className="h-4 w-4" />
            </p>
          </Link>
        ))}
      </div>

      {!filtered.length && !isError ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 text-sm font-semibold">Aucun dossier pour le moment</p>
          <Button asChild className="mt-4 h-11 w-full">
            <Link to="/simulateur">Commencer une simulation</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
};
