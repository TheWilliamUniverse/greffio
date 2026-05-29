import React from 'react';
import { cn } from '@/lib/utils.js';
import { runtimeConfig } from '@/config/runtime.js';

const SIZE_STYLES = {
  sm: {
    root: 'gap-3',
    icon: 'h-14 w-14',
    badge: 'h-11 w-[min(100%,190px)]',
  },
  md: {
    root: 'gap-4',
    icon: 'h-[4.5rem] w-[4.5rem]',
    badge: 'h-14 w-[min(100%,210px)]',
  },
  mdInline: {
    root: 'flex-row items-center gap-3 sm:gap-4',
    icon: 'h-16 w-16 shrink-0',
    badge: 'h-[3.25rem] w-auto min-w-[150px] max-w-[calc(100%-4.5rem)] flex-1 object-contain',
  },
  lg: {
    root: 'gap-4 sm:gap-5',
    icon: 'h-20 w-20',
    badge: 'h-16 w-[min(100%,240px)] sm:h-[4.25rem] sm:w-[260px]',
  },
};

export const GooglePlayStoreLink = ({
  href = runtimeConfig.playStoreUrl,
  size = 'md',
  className,
  centered = false,
}) => {
  const styles = SIZE_STYLES[size] || SIZE_STYLES.md;
  const isInline = size === 'mdInline';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Télécharger Greffio sur Google Play"
      className={cn(
        'group inline-flex max-w-full transition-opacity hover:opacity-95',
        isInline ? 'flex-row items-center' : 'flex-col',
        centered && !isInline ? 'items-center' : !isInline ? 'items-start' : '',
        styles.root,
        className,
      )}
    >
      <img
        src="/images/store/greffio-app-icon.png"
        alt="Icône de l’application Greffio"
        width={80}
        height={80}
        className={cn(
          'rounded-[22%] border border-border bg-white shadow-elevation-sm transition-transform group-hover:scale-[1.02]',
          styles.icon,
        )}
      />
      <img
        src="/images/store/google-play-badge-fr.png"
        alt="Disponible sur Google Play"
        width={646}
        height={250}
        className={cn('object-contain object-left', styles.badge, centered && 'object-center')}
      />
    </a>
  );
};
