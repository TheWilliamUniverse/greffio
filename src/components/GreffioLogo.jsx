import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';

export const GreffioLogo = ({ variant = 'full', className = '' }) => {
  const isIconOnly = variant === 'icon-only' || variant === 'mark';
  const isTile = variant === 'tile' || variant === 'inverse';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.25 }}
      className={cn('inline-flex items-center select-none', className)}
      aria-label="Greffio"
    >
      {isIconOnly ? (
        <span className="logo-sheen inline-flex h-11 w-11 items-center justify-center rounded-md bg-[hsl(var(--greffio-blue))] text-xl font-extrabold text-white shadow-elevation-sm">
          G
        </span>
      ) : (
        <span
          className={cn(
            'logo-sheen inline-flex items-center rounded-md font-extrabold leading-none',
            isTile ?
               'bg-[hsl(var(--greffio-blue))] px-5 py-3 text-3xl text-white shadow-elevation-md md:text-4xl'
              : 'text-3xl text-[hsl(var(--greffio-blue))] md:text-4xl'
          )}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Greffio
        </span>
      )}
    </motion.div>
  );
};
