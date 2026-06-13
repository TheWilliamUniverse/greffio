import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';

export const GreffioLogo = ({ variant = 'full', className = '', to }) => {
  const isIconOnly = variant === 'icon-only' || variant === 'mark';
  const isTile = variant === 'tile' || variant === 'inverse';

  const logo = (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.25 }}
      className={cn('notranslate inline-flex items-center select-none', !to && className)}
      translate="no"
      lang="fr"
      aria-hidden={Boolean(to)}
    >
      {isIconOnly ? (
        <img
          src="/icons/greffio-icon.svg"
          alt=""
          className={cn('h-11 w-11 rounded-md shadow-elevation-sm', className)}
          width={44}
          height={44}
        />
      ) : (
        <span
          className={cn(
            'logo-sheen inline-flex items-center rounded-md font-extrabold leading-none',
            isTile ?
               'bg-[hsl(var(--greffio-blue))] px-5 py-3 text-3xl text-white shadow-elevation-md md:text-4xl'
              : 'text-3xl text-[hsl(var(--greffio-blue))] md:text-4xl'
          )}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          translate="no"
          lang="fr"
        >
          Greffio
        </span>
      )}
    </motion.span>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          'inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          className,
        )}
        aria-label="Greffio — Retour à l’accueil"
        translate="no"
      >
        {logo}
      </Link>
    );
  }

  return logo;
};
