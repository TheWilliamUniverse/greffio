import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';

const WORDMARK_FONT = "'Plus Jakarta Sans', sans-serif";

const resolveVariant = (variant) => {
  if (variant === 'icon-only' || variant === 'mark') return 'mark';
  if (variant === 'tile' || variant === 'inverse') return 'tile';
  if (variant === 'wordmark-on-blue' || variant === 'on-blue') return 'wordmark-on-blue';
  if (variant === 'wordmark' || variant === 'full') return 'wordmark';
  return 'wordmark';
};

export const GreffioLogo = ({ variant = 'full', className = '', to, linkLabel }) => {
  const resolved = resolveVariant(variant);
  const isIconOnly = resolved === 'mark';
  const isTile = resolved === 'tile';
  const isOnBlue = resolved === 'wordmark-on-blue';

  const wordmark = (
    <span
      className={cn(
        'logo-sheen inline-flex items-center font-extrabold leading-none',
        isTile
          ? 'rounded-md bg-[hsl(var(--greffio-blue))] px-5 py-3 text-3xl text-white shadow-elevation-md md:text-4xl'
          : isOnBlue
            ? 'text-2xl text-white md:text-3xl'
            : 'text-3xl text-[hsl(var(--greffio-blue))] md:text-4xl',
        !isOnBlue && 'rounded-md',
        className,
      )}
      style={{ fontFamily: WORDMARK_FONT }}
      translate="no"
      lang="fr"
    >
      Greffio
    </span>
  );

  const logo = (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.25 }}
      className="notranslate inline-flex items-center select-none"
      translate="no"
      lang="fr"
      aria-hidden={Boolean(to)}
    >
      {isIconOnly ? (
        <img
          src="/icons/greffio-icon.svg"
          alt=""
          className={cn('h-11 w-11 rounded-md shadow-elevation-sm', !to && className)}
          width={44}
          height={44}
        />
      ) : (
        wordmark
      )}
    </motion.span>
  );

  if (to) {
    const resolvedLinkLabel = linkLabel || (
      to === '/dashboard'
        ? 'Greffio – Retour au tableau de bord'
        : 'Greffio – Retour à l’accueil'
    );
    return (
      <Link
        to={to}
        className={cn(
          'inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isOnBlue && 'focus-visible:ring-offset-[hsl(var(--greffio-blue))]',
        )}
        aria-label={resolvedLinkLabel}
        translate="no"
      >
        {logo}
      </Link>
    );
  }

  return logo;
};
