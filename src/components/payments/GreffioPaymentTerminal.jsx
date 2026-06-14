import React, { useState } from 'react';
import { ArrowRight, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PaymentBrandBadges } from '@/components/layout/PaymentBrandBadges.jsx';
import { LegalAcceptanceCheckbox } from '@/components/payments/LegalAcceptanceCheckbox.jsx';
import { cn } from '@/lib/utils.js';

export const GreffioPaymentTerminal = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  onPayByCard,
  isCreatingPayment = false,
  payButtonLabel = 'Payer en ligne',
  requireLegalAcceptance = true,
  className,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const payDisabled = isCreatingPayment || !amountCents || (requireLegalAcceptance && !termsAccepted);

  return (
    <section
      className={cn(
        'relative mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#cfe0f5]',
        'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%,#eef4ff_100%)]',
        'shadow-[0_28px_80px_rgba(30,77,140,0.14)]',
        className,
      )}
    >
      <div className="relative border-b border-white/70 px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Paiement sécurisé</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
              Régler en toute sécurité
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {offerLabel} – redirection vers la page sécurisée Mollie (carte, CB, Apple Pay selon appareil).
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-center sm:min-w-[180px] sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Montant TTC</p>
            <p className="mt-0.5 text-3xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel || '–'}</p>
          </div>
        </div>
      </div>

      <div className="relative space-y-4 px-5 py-6 sm:px-7">
        <div className="rounded-2xl border border-[#dbe7f7] bg-white px-4 py-5 shadow-[0_12px_32px_rgba(30,77,140,0.06)] sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--greffio-blue))] text-white">
              <CreditCard className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">Carte bancaire</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Visa, Mastercard, CB et autres moyens proposés par Mollie selon votre appareil.
              </p>
              <div className="mt-4">
                <PaymentBrandBadges compact />
              </div>
            </div>
          </div>
        </div>

        {requireLegalAcceptance ? (
          <LegalAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
        ) : null}

        <Button
          type="button"
          className="h-12 w-full justify-between rounded-xl text-base font-bold"
          onClick={onPayByCard}
          disabled={payDisabled}
        >
          {isCreatingPayment ? 'Redirection vers Mollie…' : `${payButtonLabel}${amountLabel ? ` – ${amountLabel}` : ''}`}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          Paiement traité par Mollie · Données chiffrées · Aucun stockage de carte côté Greffio
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/70 bg-white/60 px-5 py-4 text-xs text-muted-foreground sm:justify-between">
        <p className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Transaction sécurisée
        </p>
        <p className="inline-flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-primary" />
          Chiffrement TLS
        </p>
      </div>
    </section>
  );
};
