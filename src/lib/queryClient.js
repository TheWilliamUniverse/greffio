import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
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
  queryClient.invalidateQueries({ predicate: (query) => query.meta?.live === true });
};

export const clearAuthenticatedQueries = () => {
  queryClient.clear();
};
