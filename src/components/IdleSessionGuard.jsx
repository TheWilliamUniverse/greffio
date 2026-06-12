import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { Button } from '@/components/ui/button.jsx';
import { isCapacitorNative } from '@/utils/platform.js';

const IDLE_MS = 30 * 60 * 1000;
const CHECK_MS = 15 * 1000;

export const IdleSessionGuard = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const [locked, setLocked] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lockedRef = useRef(false);

  const guardEnabled = isAuthenticated && !isCapacitorNative();

  const lockSession = useCallback(async () => {
    if (lockedRef.current || !guardEnabled) return;
    lockedRef.current = true;
    setLocked(true);
    await logout();
  }, [guardEnabled, logout]);

  const touchActivity = useCallback(() => {
    if (!guardEnabled || lockedRef.current) return;
    lastActivityRef.current = Date.now();
  }, [guardEnabled]);

  const evaluateIdle = useCallback(() => {
    if (!guardEnabled || lockedRef.current) return;
    if (Date.now() - lastActivityRef.current >= IDLE_MS) {
      void lockSession();
    }
  }, [guardEnabled, lockSession]);

  useEffect(() => {
    if (!guardEnabled) {
      lockedRef.current = false;
      setLocked(false);
      return undefined;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, touchActivity, { passive: true }));

    const onVisibility = () => {
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

  const handleReconnect = () => {
    window.location.href = '/login';
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {locked ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(var(--greffio-blue))]/95 p-6 text-white"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15"
              >
                <LockKeyhole className="h-8 w-8" />
              </motion.div>
              <h2 className="text-2xl font-extrabold">Session verrouillée</h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Vous avez été inactif pendant 30 minutes. Pour protéger vos dossiers, reconnectez-vous pour continuer.
              </p>
              <Button className="mt-6 h-11 w-full bg-white text-[hsl(var(--greffio-blue))] hover:bg-white/90" onClick={handleReconnect}>
                Se reconnecter
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
