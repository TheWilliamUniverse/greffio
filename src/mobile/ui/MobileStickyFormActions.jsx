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
  aboveBottomNav = false,
}) => {
  const keyboardOffset = useMobileKeyboardOffset();
  const mobileLayout = isCapacitorNative() || isMobileBrowserViewport();
  const bottomNavVar = isCapacitorNative() ? 'var(--bottom-nav-height)' : 'var(--bottom-nav-height-web, 3.5rem)';
  const bottomStyle = keyboardOffset
    ? { bottom: `${keyboardOffset}px` }
    : aboveBottomNav
      ? { bottom: `calc(${bottomNavVar} + env(safe-area-inset-bottom))` }
      : undefined;
  const spacerStyle = aboveBottomNav
    ? { height: `calc(5.5rem + ${bottomNavVar} + env(safe-area-inset-bottom))` }
    : undefined;

  if (!mobileLayout) {
    return (
      <div className={cn('mt-6 flex flex-wrap gap-2 border-t border-[var(--we-border)] bg-white pt-4', className)}>
        {children}
      </div>
    );
  }

  return (
    <>
      {fixed ? (
        <div
          className={cn('shrink-0 md:hidden', !aboveBottomNav && 'h-[5.5rem]')}
          style={spacerStyle}
          aria-hidden="true"
        />
      ) : null}
      <div
        className={cn(
          'mobile-sticky-form-actions',
          fixed && 'mobile-sticky-form-actions--fixed',
          className,
        )}
        style={bottomStyle}
      >
        <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap', innerClassName)}>
          {children}
        </div>
      </div>
    </>
  );
};
