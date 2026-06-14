import React from 'react';
import {
  ArrowRight,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PaymentBrandBadges } from '@/components/layout/PaymentBrandBadges.jsx';
import { cn } from '@/lib/utils.js';

export const GreffioPaymentTerminal = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  onPayByCard,
  isCreatingPayment = false,
  payButtonLabel = 'Payer avec Mollie',
  className,
}) => (
  <section
    className={cn(
      'relative mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#cfe0f5]',
      'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%,#eef4ff_100%)]',
      'shadow-[0_28px_80px_rgba(30,77,140,0.14)]',
      className,
    )}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[hsl(var(--greffio-blue))]/10 to-transparent" />

    <div className="relative border-b border-white/70 px-5 py-6 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--greffio-blue))] text-white shadow-lg shadow-[hsl(var(--greffio-blue))]/20">
            <WalletCards className="h-5 w-5" />
          </span>
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Terminal Greffio
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
              Régler en toute sécurité
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Paiement par carte via Mollie. Vous serez redirigé vers la page sécurisée pour finaliser le règlement.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-center sm:min-w-[180px] sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Montant TTC</p>
          <p className="mt-0.5 text-3xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel || '–'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{offerLabel}</p>
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
              Visa, Mastercard et autres moyens disponibles sur Mollie. Confirmation serveur Greffio avant validation.
            </p>
            <div className="mt-4">
              <PaymentBrandBadges compact />
            </div>
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="h-12 w-full justify-between rounded-xl text-base font-bold"
        onClick={onPayByCard}
        disabled={isCreatingPayment || !amountCents}
      >
        {isCreatingPayment ? 'Redirection vers Mollie…' : `${payButtonLabel} – ${amountLabel || ''}`}
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        Paiement traité par Mollie · Données chiffrées · Aucun stockage de carte côté Greffio
      </p>
    </div>

    <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/70 bg-white/60 px-5 py-4 text-xs text-muted-foreground sm:justify-between">
      <p className="inline-flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Confirmation serveur avant traitement
      </p>
      <p className="inline-flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-primary" />
        Chiffrement TLS · Greffio
      </p>
    </div>
  </section>
);
