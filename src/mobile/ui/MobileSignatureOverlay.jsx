import React from 'react';
import { cn } from '@/lib/utils.js';

/**
 * Overlay signature mobile – bottom sheet + centré desktop.
 */
export const MobileSignatureOverlay = ({ open, children, footerHint = '' }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className={cn(
        'w-full max-w-lg pb-[env(safe-area-inset-bottom)] sm:pb-0',
      )}
      >
        {children}
        {footerHint ? (
          <p className="mt-2 px-2 text-center text-xs text-white/80 sm:px-0">{footerHint}</p>
        ) : null}
      </div>
    </div>
  );
};
