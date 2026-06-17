import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';

const MOLLIE_WORDMARK_SRC = '/images/payments/mollie-wordmark.svg';

export const MollieSecureTrustBadge = ({ className, centered = true }) => (
  <p
    className={cn(
      'inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs leading-5 text-muted-foreground',
      centered && 'mx-auto',
      className,
    )}
  >
    <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
    <span className="shrink-0">Paiements sécurisés effectués par</span>
    <img
      src={MOLLIE_WORDMARK_SRC}
      alt="mollie"
      className="h-[22px] w-auto max-w-[6rem] shrink-0 object-contain object-left"
      width={72}
      height={22}
    />
  </p>
);

export const MolliePaymentTrustFooter = ({ className }) => {
  const showMobileLine = isCapacitorNative() || isMobileBrowserViewport();
  return (
    <div className={cn('space-y-2 overflow-visible px-1 text-center', className)}>
      <MollieSecureTrustBadge className="w-full" />
      {showMobileLine ? (
        <p className="text-[11px] leading-5 text-muted-foreground/85 md:hidden">
          Paiement sécurisé par Mollie
        </p>
      ) : null}
      <p className="text-[11px] leading-5 text-muted-foreground/85">
        Données chiffrées · Aucun stockage de carte côté Greffio
      </p>
    </div>
  );
};
