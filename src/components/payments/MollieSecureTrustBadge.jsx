import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const MOLLIE_WORDMARK_SRC = '/images/payments/mollie-wordmark.svg';

export const MollieSecureTrustBadge = ({ className, centered = true }) => (
  <p
    className={cn(
      'inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-5 text-muted-foreground',
      centered && 'justify-center',
      className,
    )}
  >
    <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
    <span>Paiements sécurisés effectués par</span>
    <img
      src={MOLLIE_WORDMARK_SRC}
      alt="mollie"
      className="h-[14px] w-auto shrink-0 translate-y-[0.5px]"
      width={52}
      height={14}
    />
  </p>
);

export const MolliePaymentTrustFooter = ({ className }) => (
  <div className={cn('space-y-2 text-center', className)}>
    <MollieSecureTrustBadge className="w-full" />
    <p className="text-[11px] leading-5 text-muted-foreground/85">
      Données chiffrées · Aucun stockage de carte côté Greffio
    </p>
  </div>
);
