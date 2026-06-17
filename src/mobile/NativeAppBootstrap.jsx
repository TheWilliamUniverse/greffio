import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { isCapacitorNative } from '@/utils/platform.js';
import {
  hasCompletedNativeWelcome,
  hasNativeColdStartRouted,
  markNativeColdStartRouted,
} from '@/utils/nativeAppStorage.js';
import { resolveNativePostLoginPath } from '@/utils/nativeColdStart.js';

const PUBLIC_NATIVE_HOME = '/app/home';
const NATIVE_WELCOME = '/app/welcome';

const isNativeEntryPath = (pathname) => pathname === '/'
  || pathname === PUBLIC_NATIVE_HOME
  || pathname === NATIVE_WELCOME;

/**
 * Routage natif : welcome 1er lancement, accueil app visiteur, cold start connecté.
 */
export const NativeAppBootstrap = () => {
  const { isAuthenticated, loading, currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCapacitorNative() || loading) return;

    const { pathname } = location;

    if (isAuthenticated) {
      if (pathname === NATIVE_WELCOME || pathname === PUBLIC_NATIVE_HOME || pathname === '/') {
        if (hasNativeColdStartRouted()) return;
        markNativeColdStartRouted();
        void resolveNativePostLoginPath(currentUser).then((target) => {
          navigate(target, { replace: true });
        });
      }
      return;
    }

    if (pathname !== '/') return;

    if (!hasCompletedNativeWelcome()) {
      navigate(NATIVE_WELCOME, { replace: true });
      return;
    }

    navigate(PUBLIC_NATIVE_HOME, { replace: true });
  }, [isAuthenticated, loading, location.pathname, navigate]);

  return null;
};
