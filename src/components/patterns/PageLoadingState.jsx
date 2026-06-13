import React from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { cn } from '@/lib/utils.js';

export const PageLoadingState = ({
  label = 'Chargement…',
  description,
  variant = 'spinner',
  compact = false,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8' : 'min-h-[280px] py-12',
      className,
    )}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    {variant === 'skeleton' ? (
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="mx-auto h-10 w-10 rounded-full" />
        <Skeleton className="mx-auto h-4 w-48" />
        <Skeleton className="mx-auto h-3 w-64" />
      </div>
    ) : (
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    )}
    <p className="mt-4 text-sm font-semibold text-foreground">{label}</p>
    {description ? (
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    ) : null}
  </div>
);
