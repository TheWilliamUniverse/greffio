import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAuthenticatedQueries } from '@/lib/queryClient.js';

const SHELL_TAB_ROUTES = new Set([
  '/dashboard',
  '/dossiers',
  '/documents',
  '/team',
  '/mobile/account',
  '/profil',
  '/settings',
]);

const isShellTabRoute = (pathname = '') => (
  SHELL_TAB_ROUTES.has(pathname)
  || pathname.startsWith('/dossier/')
  || pathname.startsWith('/documents/')
);

export const useRouteQueryInvalidation = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const pathname = location.pathname;
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    if (isShellTabRoute(pathname) && isShellTabRoute(previousPath)) {
      return;
    }

    invalidateAuthenticatedQueries();
  }, [location.pathname, queryClient]);
};
