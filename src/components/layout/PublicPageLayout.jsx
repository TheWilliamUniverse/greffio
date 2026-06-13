import React from 'react';
import { cn } from '@/lib/utils.js';
import { GreffioUltraFooter } from '@/components/layout/GreffioUltraFooter.jsx';
import { PublicMinimalLegalFooter } from '@/components/layout/PublicMinimalLegalFooter.jsx';

/** Compose le footer public existant sans modifier son design. */
export const PublicPageLayout = ({
  children,
  showFooter = true,
  footer = 'marketing',
  className,
}) => (
  <div className={cn('flex min-h-screen flex-col', className)}>
    <div className="flex-1">{children}</div>
    {showFooter && footer === 'marketing' ? <GreffioUltraFooter /> : null}
    {showFooter && footer === 'minimal' ? <PublicMinimalLegalFooter /> : null}
  </div>
);
