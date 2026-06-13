import React from 'react';
import { cn } from '@/lib/utils.js';
import { useMobileSafeBottomPadding } from '@/hooks/useMobileSafeBottomPadding.js';

/**
 * Conteneur standard cockpit mobile – padding bas au-dessus bottom nav + FAB.
 */
export const MobilePageContainer = ({
  children,
  className,
  hasBottomNav = true,
  spacing = 'default',
}) => {
  const bottomPad = useMobileSafeBottomPadding({ hasBottomNav });

  return (
    <div
      className={cn(
        spacing === 'default' ? 'space-y-5 px-4 py-5' : 'space-y-4 px-4 py-5',
        bottomPad,
        className,
      )}
    >
      {children}
    </div>
  );
};
