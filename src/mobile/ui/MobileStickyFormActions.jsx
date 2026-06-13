import React from 'react';
import { cn } from '@/lib/utils.js';
import { useMobileKeyboardOffset } from '@/hooks/useMobileKeyboardOffset.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

/**
 * Barre d’actions sticky au-dessus du clavier – formulaires signature mobile.
 */
export const MobileStickyFormActions = ({
  children,
  className,
  innerClassName,
  fixed = true,
}) => {
  const keyboardOffset = useMobileKeyboardOffset();
  const mobileLayout = isCapacitorNative() || isMobileBrowserViewport();

  if (!mobileLayout) {
    return (
      <div className={cn('mt-6 flex flex-wrap gap-2 border-t border-[var(--we-border)] bg-white pt-4', className)}>
        {children}
      </div>
    );
  }

  return (
    <>
      {fixed ? <div className="h-[5.5rem] shrink-0 md:hidden" aria-hidden="true" /> : null}
      <div
        className={cn(
          'mobile-sticky-form-actions',
          fixed && 'mobile-sticky-form-actions--fixed',
          className,
        )}
        style={keyboardOffset ? { bottom: `${keyboardOffset}px` } : undefined}
      >
        <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap', innerClassName)}>
          {children}
        </div>
      </div>
    </>
  );
};
