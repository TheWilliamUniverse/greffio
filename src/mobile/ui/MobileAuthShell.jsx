import React from 'react';
import { cn } from '@/lib/utils.js';

export const mobileAuthInputClass = 'text-base md:text-sm';

export const MobileAuthField = ({ className, ...props }) => (
  <input
    {...props}
    className={cn(
      'flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:text-sm',
      className,
    )}
  />
);

export const MobileAuthShell = ({ title, subtitle, children }) => (
  <div className="mx-auto w-full max-w-md px-4 py-6 md:max-w-lg md:py-10">
    <div className="mb-6 space-y-2 text-center md:text-left">
      <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">{title}</h1>
      {subtitle ? <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
    </div>
    {children}
  </div>
);
