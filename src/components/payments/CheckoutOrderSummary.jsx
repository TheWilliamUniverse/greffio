import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils.js';

export const CheckoutOrderSummary = ({
  title = 'Résumé de commande',
  lineItems = [],
  subtotalLabel,
  subtotalAmount,
  totalLabel = 'Total TTC',
  totalAmount,
  children,
  showPromo = true,
  sticky = true,
  className,
}) => {
  const [promoOpen, setPromoOpen] = useState(false);

  return (
    <aside
      className={cn(
        'rounded-xl border border-border bg-white shadow-elevation-sm',
        sticky && 'lg:sticky lg:top-6 lg:self-start',
        className,
      )}
    >
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {lineItems.length > 0 ? (
          <ul className="space-y-2.5 text-sm">
            {lineItems.map((item) => (
              <li key={item.id || item.label} className="flex justify-between gap-3">
                <span className="min-w-0 text-muted-foreground">{item.label}</span>
                <span className="shrink-0 font-semibold text-foreground">{item.amount}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {subtotalLabel && subtotalAmount ? (
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">{subtotalLabel}</span>
            <span className="font-semibold">{subtotalAmount}</span>
          </div>
        ) : null}

        {totalAmount ? (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-muted-foreground">{totalLabel}</span>
            <span className="text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{totalAmount}</span>
          </div>
        ) : null}

        {children}
      </div>

      {showPromo ? (
        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => setPromoOpen((open) => !open)}
            className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            aria-expanded={promoOpen}
          >
            Code promo
            <ChevronDown className={cn('h-4 w-4 transition', promoOpen && 'rotate-180')} />
          </button>
          {promoOpen ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Les codes promotionnels seront disponibles prochainement.
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
};
