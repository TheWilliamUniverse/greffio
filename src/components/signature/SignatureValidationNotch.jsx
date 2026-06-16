import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils.js';

/** Encoche bleue de validation Greffio (alignée DocumentStatusCard.shieldNotch). */
export const SignatureValidationNotch = ({
  className = '',
  iconClassName = '',
  size = 'lg',
}) => (
  <div
    className={cn(
      'flex items-center justify-center rounded-l-2xl bg-primary text-white shadow-md',
      size === 'lg' ? 'h-14 w-14' : 'h-11 w-11',
      className,
    )}
    aria-hidden="true"
  >
    <ShieldCheck
      className={cn(size === 'lg' ? 'h-7 w-7' : 'h-5 w-5', iconClassName)}
      strokeWidth={2.2}
    />
  </div>
);
