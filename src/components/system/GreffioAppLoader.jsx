import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils.js';

const MARK_SRC = '/icons/clareffio-arc.svg';

export const GreffioAppLoader = ({
  label = 'Chargement…',
  className,
  fullScreen = false,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background',
        fullScreen ? 'min-h-dvh' : 'min-h-[50vh] w-full',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative h-16 w-16 overflow-visible" aria-hidden="true">
        <motion.img
          src={MARK_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          animate={reduceMotion ? undefined : { scale: [1, 0.97, 1, 1] }}
          transition={{ duration: 1.55, times: [0, 0.34, 0.48, 1], repeat: Infinity, ease: 'easeInOut' }}
        />
        {!reduceMotion ? (
          <motion.img
            src={MARK_SRC}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            style={{ clipPath: 'polygon(14% 88%, 24% 66%, 70% 17%, 91% 5%, 80% 31%, 37% 74%)' }}
            animate={{
              x: [0, -1, 0, 18, 18],
              y: [0, 1, 0, -18, -18],
              opacity: [1, 1, 1, 0, 0],
            }}
            transition={{ duration: 1.55, times: [0, 0.34, 0.48, 0.66, 1], repeat: Infinity, ease: 'easeOut' }}
          />
        ) : null}
      </div>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
};
