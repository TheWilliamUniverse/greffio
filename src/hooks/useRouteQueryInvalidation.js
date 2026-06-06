import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAuthenticatedQueries } from '@/lib/queryClient.js';

export const useRouteQueryInvalidation = () => {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    invalidateAuthenticatedQueries();
  }, [location.pathname, queryClient]);
};
