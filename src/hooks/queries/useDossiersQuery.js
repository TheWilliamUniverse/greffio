import { useQuery } from '@tanstack/react-query';
import { listDossiers } from '@/api/dossiers.js';
import { queryKeys } from '@/hooks/queries/queryKeys.js';

export const useDossiersQuery = (userId) => useQuery({
  queryKey: queryKeys.dossiers(userId),
  meta: { live: true },
  queryFn: async () => {
    const payload = await listDossiers();
    return Array.isArray(payload?.dossiers) ? payload.dossiers : [];
  },
  enabled: Boolean(userId),
  staleTime: 30_000,
});
