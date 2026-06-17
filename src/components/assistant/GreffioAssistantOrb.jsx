import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth.js';
import { GreffioAssistantPanel } from '@/components/assistant/GreffioAssistantPanel.jsx';
import { Button } from '@/components/ui/button.jsx';
import { greffioOrbBreathe } from '@/motion/greffioMotion.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

const GreffioRobotIcon = ({ className = '' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <rect x="14" y="18" width="36" height="30" rx="10" fill="currentColor" opacity="0.12" />
    <rect x="18" y="22" width="28" height="22" rx="8" fill="currentColor" />
    <circle cx="27" cy="33" r="3.5" fill="white" />
    <circle cx="37" cy="33" r="3.5" fill="white" />
    <rect x="28" y="40" width="8" height="2.5" rx="1.25" fill="white" opacity="0.9" />
    <rect x="30" y="8" width="4" height="10" rx="2" fill="currentColor" />
    <circle cx="32" cy="7" r="3" fill="currentColor" />
    <rect x="8" y="28" width="8" height="4" rx="2" fill="currentColor" />
    <rect x="48" y="28" width="8" height="4" rx="2" fill="currentColor" />
  </svg>
);

export const GreffioAssistantOrb = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const greeting = useMemo(() => {
    const name = currentUser?.firstName?.trim();
    if (name) return `Bonjour ${name}`;
    return 'Bonjour';
  }, [currentUser?.firstName]);

  if (!isAuthenticated) return null;

  const isMobile = isCapacitorNative() || isMobileBrowserViewport();

  return (
    <>
      <div className={`pointer-events-none fixed z-[70] ${isMobile ? 'bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4' : 'bottom-5 right-5'}`}>
        <AnimatePresence>
          {hovered && !open ? (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="pointer-events-none mb-3 mr-2 hidden rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-elevation-sm md:block"
            >
              {greeting} – besoin d’aide ?
            </motion.div>
          ) : null}
        </AnimatePresence>
        <button
          type="button"
          aria-label="Ouvrir l’assistant Greffio"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-white text-primary shadow-[0_12px_32px_rgba(30,77,140,0.18)] transition-shadow hover:shadow-[0_14px_36px_rgba(30,77,140,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <motion.div
            animate={hovered ? { scale: 1, opacity: 1 } : greffioOrbBreathe.animate}
            transition={hovered ? { duration: 0.2 } : greffioOrbBreathe.transition}
            className="flex items-center justify-center"
          >
            <GreffioRobotIcon className="h-8 w-8" />
          </motion.div>
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-end bg-[#0a1220]/35 p-3 sm:p-4 md:p-6"
          >
            <button
              type="button"
              aria-label="Fermer l’assistant"
              className="absolute inset-0"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className={`relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-lg ${
              isMobile
                ? 'h-[min(560px,72dvh)] w-full max-w-none'
                : 'h-[min(720px,88dvh)] w-full max-w-lg'
            }`}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <GreffioRobotIcon className="h-7 w-7 text-primary" />
                  <div>
                    <p className="text-sm font-extrabold text-foreground">Assistant Greffio</p>
                    <p className="text-xs text-muted-foreground">{greeting}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fermer">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <GreffioAssistantPanel />
              </div>
              <div className="border-t border-border px-4 py-2 text-center text-[11px] text-muted-foreground">
                <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
                Réponses indicatives – l’équipe Greffio valide les points juridiques sensibles.
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
