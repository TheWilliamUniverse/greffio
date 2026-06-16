import React from 'react';
import { cn } from '@/lib/utils.js';

/** Parent hôte d'un badge absolu — évite le clipping du Button (`overflow-hidden`). */
export const countBadgeHostClass = 'relative overflow-visible';

export const CountBadge = ({
  count,
  max = 9,
  className,
  positionClassName = '-right-1.5 -top-1.5',
}) => {
  const numeric = Number(count);
  if (!numeric || numeric <= 0) return null;
  const label = numeric > max ? `${max}+` : String(numeric);

  return (
    <span
      className={cn(
        'pointer-events-none absolute z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1',
        'text-[10px] font-bold leading-none tabular-nums text-white',
        positionClassName,
        className,
      )}
      aria-hidden="true"
    >
      {label}
    </span>
  );
};
