import React from 'react';
import { WalletCards } from 'lucide-react';
import { AmazonPayCheckoutPanel } from '@/components/payments/AmazonPayCheckoutPanel.jsx';
import { GooglePayCheckoutPanel } from '@/components/payments/GooglePayCheckoutPanel.jsx';
import { PaymentBrandBadges } from '@/components/layout/PaymentBrandBadges.jsx';
import { cn } from '@/lib/utils.js';

export const WalletPaymentTerminal = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  dossierId,
  resourceOrderId,
  offerCode,
  className,
}) => (
  <section
    className={cn(
      'mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-[#cfe0f5] bg-gradient-to-br from-[#f8fbff] via-white to-[#eef5ff] p-5 shadow-[0_18px_50px_rgba(30,77,140,0.12)] sm:p-6',
      className,
    )}
  >
    <div className="mb-5 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--greffio-blue))] text-white shadow-sm">
        <WalletCards className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-primary">Terminal Greffio</p>
      <h2 className="mt-1 text-xl font-extrabold text-[hsl(var(--greffio-blue-900))]">Paiement express</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Amazon Pay en priorité, puis Google Pay ou carte bancaire. Confirmation serveur avant traitement.
      </p>
      <PaymentBrandBadges className="mt-4 justify-center" />
    </div>

    <div className="space-y-3">
      <AmazonPayCheckoutPanel
        amountCents={amountCents}
        amountLabel={amountLabel}
        offerLabel={offerLabel}
        dossierId={dossierId}
        resourceOrderId={resourceOrderId}
        offerCode={offerCode}
        className="border-white/70 shadow-none"
      />
      <GooglePayCheckoutPanel
        amountCents={amountCents}
        amountLabel={amountLabel}
        offerLabel={offerLabel}
        dossierId={dossierId}
        resourceOrderId={resourceOrderId}
        offerCode={offerCode}
        className="border-white/70 shadow-none"
      />
    </div>
  </section>
);
