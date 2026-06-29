import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth.js';
import { clearOpsStepUp } from '@/lib/auth/opsStepUp.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { isExternalCheckoutActive } from '@/utils/paymentCheckoutNavigation.js';

const IDLE_MS = 30 * 60 * 1000;
const CHECK_MS = 15 * 1000;

export const useIdleLock = () => {
  const { isAuthenticated, logout } = useAuth();
  const [locked, setLocked] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lockedRef = useRef(false);
  const idleExpiredRef = useRef(false);

  const guardEnabled = isAuthenticated && !isCapacitorNative();

  const lockSession = useCallback(async () => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    idleExpiredRef.current = true;
    clearOpsStepUp();
    setLocked(true);
    if (isAuthenticated) {
      await logout({ silent: true, reason: 'idle' });
    }
  }, [isAuthenticated, logout]);

  const touchActivity = useCallback(() => {
    if (idleExpiredRef.current || lockedRef.current) return;
    if (!guardEnabled) return;
    lastActivityRef.current = Date.now();
  }, [guardEnabled]);

  const evaluateIdle = useCallback(() => {
    if (idleExpiredRef.current || lockedRef.current) return;
    if (!guardEnabled) return;
    if (isExternalCheckoutActive()) {
      lastActivityRef.current = Date.now();
      return;
    }
    if (Date.now() - lastActivityRef.current >= IDLE_MS) {
      void lockSession();
    }
  }, [guardEnabled, lockSession]);

  useEffect(() => {
    if (idleExpiredRef.current) return undefined;
    if (!guardEnabled) {
      lockedRef.current = false;
      setLocked(false);
      return undefined;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, touchActivity, { passive: true }));

    const onVisibility = () => {
      if (!document.hidden && isExternalCheckoutActive()) {
        lastActivityRef.current = Date.now();
      }
      if (!document.hidden) evaluateIdle();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const intervalId = window.setInterval(evaluateIdle, CHECK_MS);
    touchActivity();

    return () => {
      events.forEach((event) => window.removeEventListener(event, touchActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [guardEnabled, touchActivity, evaluateIdle]);

  const handleReconnect = useCallback(() => {
    window.location.href = '/login';
  }, []);

  return { locked, handleReconnect };
};
