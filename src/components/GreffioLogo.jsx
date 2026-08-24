import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';

const WORDMARK_SRC = '/icons/clareffio-wordmark.svg';
const MARK_SRC = '/icons/clareffio-arc.svg';

export const GreffioWordmark = ({ className = '', size }) => (
  <img
    src={WORDMARK_SRC}
    alt="Clareffio"
    className={cn('block h-auto w-auto max-w-full', className)}
    style={size ? { height: size, width: 'auto' } : undefined}
    translate="no"
    lang="fr"
  />
);

const resolveVariant = (variant) => {
  if (variant === 'icon-only' || variant === 'mark') return 'mark';
  if (variant === 'tile' || variant === 'inverse') return 'inverse';
  if (variant === 'wordmark-on-blue' || variant === 'on-blue') return 'inverse';
  return 'wordmark';
};

export const GreffioLogo = ({ variant = 'full', className = '', to, linkLabel }) => {
  const resolved = resolveVariant(variant);
  const isIconOnly = resolved === 'mark';
  const isInverse = resolved === 'inverse';

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
          src={MARK_SRC}
          alt=""
          className={cn('h-11 w-11 object-contain', !to && className)}
          width={44}
          height={44}
        />
      ) : (
        <img
          src={WORDMARK_SRC}
          alt={to ? '' : 'Clareffio'}
          className={cn(
            'block h-auto w-[8.75rem] max-w-full object-contain md:w-[10.5rem]',
            isInverse && 'brightness-0 invert',
            className,
          )}
        />
      )}
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
