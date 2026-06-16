import { fetchDossierDetail, getDossierActionState } from '@/api/dossiers.js';
import { queryClient } from '@/lib/queryClient.js';
import { queryKeys } from '@/hooks/queries/queryKeys.js';
import { resolveDossierContinueUrl } from '@/utils/dossierContinueUrl.js';

const prefetched = new Set();
const pendingPrefetch = new Map();
const PREFETCH_DEBOUNCE_MS = 250;

const runPrefetch = (dossier = {}) => {
  const id = dossier?.id;
  if (!id || prefetched.has(id)) return;
  prefetched.add(id);

  void queryClient.prefetchQuery({
    queryKey: queryKeys.dossier(id),
    queryFn: () => fetchDossierDetail(id),
    staleTime: 30_000,
  });

  void queryClient.prefetchQuery({
    queryKey: queryKeys.dossierActionState(id),
    queryFn: async () => {
      const payload = await getDossierActionState(id);
      return payload?.actionState || null;
    },
    staleTime: 30_000,
  });
};

export const prefetchDossierContinue = (dossier = {}) => {
  const id = dossier?.id;
  if (!id || prefetched.has(id)) return;

  const existing = pendingPrefetch.get(id);
  if (existing) window.clearTimeout(existing);

  pendingPrefetch.set(id, window.setTimeout(() => {
    pendingPrefetch.delete(id);
    runPrefetch(dossier);
  }, PREFETCH_DEBOUNCE_MS));
};

export const dossierContinuePrefetchHandlers = (dossier = {}) => ({
  onMouseEnter: () => prefetchDossierContinue(dossier),
  onFocus: () => prefetchDossierContinue(dossier),
});

export const prefetchDossierRoute = (dossier = {}) => {
  runPrefetch(dossier);
  const url = resolveDossierContinueUrl(dossier);
  if (url.startsWith('/questionnaire')) {
    void import('@/pages/QuestionnairePage.jsx');
  } else if (url.startsWith('/documents')) {
    void import('@/pages/DocumentsPage.jsx');
    void import('@/mobile/MobileDocumentsPage.jsx');
  } else if (url.startsWith('/statuts')) {
    void import('@/pages/StatutesPage.jsx');
  } else if (url.startsWith('/dossier/')) {
    void import('@/mobile/MobileDossierDetailPage.jsx');
  }
};
