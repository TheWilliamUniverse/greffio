import React from 'react';
import { MobileConnectedStrip } from '@/mobile/ui/MobileConnectedStrip.jsx';
import { useMobileShellScroll } from '@/mobile/context/MobileShellScrollContext.jsx';
import { cn } from '@/lib/utils.js';

/** Header + pastille connectée sticky avec ombre commune au scroll. */
export const MobileStickyHeaderGroup = ({ children, showConnectedStrip = false }) => {
  const scrolled = useMobileShellScroll();

  return (
    <div
      className={cn(
        'sticky top-0 z-40 bg-white/95 backdrop-blur-md transition-shadow duration-200',
        scrolled ? 'shadow-[0_8px_24px_rgba(10,18,32,0.08)]' : 'shadow-none',
      )}
    >
      {children}
      {showConnectedStrip ? <MobileConnectedStrip /> : null}
    </div>
  );
};
