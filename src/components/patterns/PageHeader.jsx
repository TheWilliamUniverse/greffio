import React from 'react';
import { cn } from '@/lib/utils.js';

export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
  actions,
  className,
}) => (
  <div className={cn('flex flex-col justify-between gap-4 lg:flex-row lg:items-start', className)}>
    <div className="min-w-0">
      {breadcrumb ? <div className="mb-3">{breadcrumb}</div> : null}
      {eyebrow ? (
        <p className="text-sm font-bold uppercase text-primary">{eyebrow}</p>
      ) : null}
      {title ? (
        <h1 className={cn('font-extrabold text-foreground', eyebrow ? 'mt-2' : '', 'text-3xl')}>
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
  </div>
);
