import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { Button } from '@/components/ui/button.jsx';

const IDLE_MS = 30 * 60 * 1000;

export const IdleSessionGuard = ({ children }) => {
  const { isAuthenticated, logout } = useAuth();
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) {
      setLocked(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLocked(true), IDLE_MS);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, resetTimer]);

  const handleReconnect = async () => {
    await logout();
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
              <Button className="mt-6 h-11 w-full bg-white text-[hsl(var(--greffio-blue))] hover:bg-white/90" onClick={() => void handleReconnect()}>
                Se reconnecter
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
