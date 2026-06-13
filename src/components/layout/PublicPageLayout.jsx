import React from 'react';
import { cn } from '@/lib/utils.js';
import { GreffioUltraFooter } from '@/components/layout/GreffioUltraFooter.jsx';

/** Compose le footer public existant sans modifier son design. */
export const PublicPageLayout = ({
  children,
  showFooter = true,
  className,
}) => (
  <div className={cn('flex min-h-screen flex-col', className)}>
    <div className="flex-1">{children}</div>
    {showFooter ? <GreffioUltraFooter /> : null}
  </div>
);
