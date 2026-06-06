import { useQuery } from '@tanstack/react-query';
import { fetchDossierDetail } from '@/api/dossiers.js';
import { queryKeys } from '@/hooks/queries/queryKeys.js';

export const useDossierQuery = (dossierId, options = {}) => useQuery({
  queryKey: queryKeys.dossier(dossierId),
  meta: { live: true },
  queryFn: () => fetchDossierDetail(dossierId, options),
  enabled: Boolean(dossierId),
});
