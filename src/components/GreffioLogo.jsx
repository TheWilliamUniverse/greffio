import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';

const WORDMARK_FONT = "'Plus Jakarta Sans', Inter, system-ui, sans-serif";

export const GreffioWordmark = ({ className = '', size }) => (
  <span
    className={cn(
      'notranslate inline font-extrabold leading-none tracking-[-0.045em] text-[hsl(var(--greffio-blue-900))]',
      className,
    )}
    style={{
      fontFamily: WORDMARK_FONT,
      ...(size ? { fontSize: size } : null),
    }}
    translate="no"
    lang="fr"
  >
    Clareffio
  </span>
);

const resolveVariant = (variant) => {
  if (variant === 'tile' || variant === 'inverse') return 'inverse';
  if (variant === 'wordmark-on-blue' || variant === 'on-blue') return 'inverse';
  return 'wordmark';
};

export const GreffioLogo = ({ variant = 'full', className = '', to, linkLabel }) => {
  const resolved = resolveVariant(variant);
  const isInverse = resolved === 'inverse';

  const logo = (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'notranslate inline-flex items-center select-none whitespace-nowrap font-extrabold leading-none tracking-[-0.045em]',
        isInverse ? 'text-white' : 'text-[hsl(var(--greffio-blue-900))]',
        'text-[1.9rem] md:text-[2.15rem]',
        className,
      )}
      style={{ fontFamily: WORDMARK_FONT }}
      translate="no"
      lang="fr"
      aria-hidden={Boolean(to)}
    >
      Clareffio
    </motion.span>
  );

  if (to) {
    const resolvedLinkLabel = linkLabel || (
      to === '/dashboard'
        ? 'Clareffio – Retour au tableau de bord'
        : 'Clareffio – Retour à l’accueil'
    );
    return (
      <Link
        to={to}
        className={cn(
          'inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isInverse && 'focus-visible:ring-offset-[hsl(var(--greffio-blue))]',
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
