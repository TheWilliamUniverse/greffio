import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const invalidateAuthenticatedQueries = () => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      if (query.meta?.live !== true) return false;
      const rootKey = query.queryKey?.[0];
      // Dossier detail/list : staleTime + invalidation explicite après mutations.
      if (rootKey === 'dossier' || rootKey === 'dossiers') return false;
      return true;
    },
  });
};

export const clearAuthenticatedQueries = () => {
  queryClient.clear();
};
