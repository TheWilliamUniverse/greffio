import React from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { greffioPageTransition } from '@/motion/greffioMotion.js';

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

export const MobileShellPageTransition = ({ children }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  if (reduceMotion || isShellTabRoute(location.pathname)) {
    return children;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="min-h-0 flex-1"
        initial={greffioPageTransition.initial}
        animate={greffioPageTransition.animate}
        exit={greffioPageTransition.exit}
        transition={greffioPageTransition.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
