import React from 'react';
import { cn } from '@/lib/utils.js';
import { GreffioUltraFooter } from '@/components/layout/GreffioUltraFooter.jsx';
import { PublicMinimalLegalFooter } from '@/components/layout/PublicMinimalLegalFooter.jsx';
import { MobileFooter } from '@/mobile/MobileFooter.jsx';
import { isMobileBrowserViewport } from '@/utils/platform.js';

/** Compose le footer public existant sans modifier son design. */
export const PublicPageLayout = ({
  children,
  showFooter = true,
  footer = 'marketing',
  className,
}) => {
  const mobileWeb = isMobileBrowserViewport();

  return (
    <div className={cn('flex min-h-screen flex-col', className)}>
      <div className="flex-1">{children}</div>
      {showFooter && footer === 'marketing' ? (
        mobileWeb ? <MobileFooter /> : <GreffioUltraFooter />
      ) : null}
      {showFooter && footer === 'minimal' ? (
        mobileWeb ? <MobileFooter /> : <PublicMinimalLegalFooter />
      ) : null}
    </div>
  );
};
