import { useQuery } from '@tanstack/react-query';
import { getDossierActionState } from '@/api/dossiers.js';
import { queryKeys } from '@/hooks/queries/queryKeys.js';

export const useDossierActionStateQuery = (dossierId, options = {}) => useQuery({
  queryKey: queryKeys.dossierActionState(dossierId),
  meta: { live: true },
  queryFn: async () => {
    const payload = await getDossierActionState(dossierId);
    return payload?.actionState || null;
  },
  enabled: Boolean(dossierId),
  staleTime: 20_000,
  ...options,
});
