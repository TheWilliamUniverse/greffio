import React from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { greffioPageTransition } from '@/motion/greffioMotion.js';

export const MobileShellPageTransition = ({ children }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
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
