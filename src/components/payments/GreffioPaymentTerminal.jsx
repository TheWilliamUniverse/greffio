import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { AmazonPayCheckoutPanel } from '@/components/payments/AmazonPayCheckoutPanel.jsx';
import { GooglePayCheckoutPanel } from '@/components/payments/GooglePayCheckoutPanel.jsx';
import { cn } from '@/lib/utils.js';

const AmazonMark = () => (
  <span className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-lg bg-[#FF9900] px-2 text-[11px] font-extrabold tracking-wide text-[#111827]">
    amazon pay
  </span>
);

const GoogleMark = () => (
  <span className="inline-flex h-8 min-w-[72px] items-center justify-center rounded-lg bg-black px-2 text-[11px] font-bold text-white">
    G Pay
  </span>
);

const CardMark = () => (
  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--greffio-blue))] text-white">
    <CreditCard className="h-4 w-4" />
  </span>
);

export const GreffioPaymentTerminal = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  dossierId,
  resourceOrderId,
  offerCode,
  onPayByCard,
  isCreatingPayment = false,
  cardButtonLabel = 'Payer par carte bancaire',
  className,
}) => {
  const [activeMethod, setActiveMethod] = useState('amazon-pay');

  const methods = useMemo(() => ([
    {
      id: 'amazon-pay',
      title: 'Amazon Pay',
      subtitle: 'Paiement express avec votre compte Amazon',
      badge: 'Recommandé',
      badgeTone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      mark: <AmazonMark />,
    },
    {
      id: 'google-pay',
      title: 'Google Pay',
      subtitle: 'Cartes enregistrées dans Google Wallet',
      badge: 'Express',
      badgeTone: 'bg-sky-100 text-sky-800 border-sky-200',
      mark: <GoogleMark />,
    },
    {
      id: 'card',
      title: 'Carte bancaire',
      subtitle: 'Visa, Mastercard — confirmation serveur Greffio',
      badge: 'Sécurisé',
      badgeTone: 'bg-secondary text-primary border-[#cfe0f5]',
      mark: <CardMark />,
    },
  ]), []);

  return (
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
                Choisissez votre mode de règlement
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Un seul terminal, trois chemins. Cliquez sur un mode pour afficher le détail et finaliser le paiement.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-center sm:min-w-[180px] sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Montant TTC</p>
            <p className="mt-0.5 text-3xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel || '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{offerLabel}</p>
          </div>
        </div>
      </div>

      <div className="relative space-y-3 px-4 py-5 sm:px-5">
        {methods.map((method) => {
          const isActive = activeMethod === method.id;
          return (
            <div
              key={method.id}
              className={cn(
                'overflow-hidden rounded-2xl border transition-all duration-300',
                isActive
                  ? 'border-[hsl(var(--greffio-blue))]/30 bg-white shadow-[0_16px_40px_rgba(30,77,140,0.10)]'
                  : 'border-[#dbe7f7] bg-white/70 hover:border-[#c7daf3] hover:bg-white',
              )}
            >
              <button
                type="button"
                onClick={() => setActiveMethod(method.id)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5"
                aria-expanded={isActive}
              >
                {method.mark}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">{method.title}</p>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', method.badgeTone)}>
                      {method.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{method.subtitle}</p>
                </div>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-primary transition-transform duration-300', isActive && 'rotate-180')} />
              </button>

              <AnimatePresence initial={false}>
                {isActive ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[#eef3fb] px-4 pb-5 pt-4 sm:px-5">
                      {method.id === 'amazon-pay' ? (
                        <AmazonPayCheckoutPanel
                          embedded
                          active
                          amountCents={amountCents}
                          amountLabel={amountLabel}
                          offerLabel={offerLabel}
                          dossierId={dossierId}
                          resourceOrderId={resourceOrderId}
                          offerCode={offerCode}
                        />
                      ) : null}

                      {method.id === 'google-pay' ? (
                        <GooglePayCheckoutPanel
                          embedded
                          active
                          amountCents={amountCents}
                          amountLabel={amountLabel}
                          offerLabel={offerLabel}
                          dossierId={dossierId}
                          resourceOrderId={resourceOrderId}
                          offerCode={offerCode}
                        />
                      ) : null}

                      {method.id === 'card' ? (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-[#dbe7f7] bg-[#f8fbff] px-4 py-4">
                            <p className="text-sm font-semibold text-[hsl(var(--greffio-blue-900))]">
                              Paiement carte via prestataire sécurisé
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              Vous serez redirigé vers la page de paiement sécurisée Greffio pour saisir votre carte bancaire.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              <span className="rounded-md bg-white px-2 py-1">Visa</span>
                              <span className="rounded-md bg-white px-2 py-1">Mastercard</span>
                              <span className="rounded-md bg-white px-2 py-1">3-D Secure</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            className="h-12 w-full justify-between rounded-xl text-base font-bold"
                            onClick={onPayByCard}
                            disabled={isCreatingPayment || !amountCents}
                          >
                            {isCreatingPayment ? 'Initialisation…' : `${cardButtonLabel} — ${amountLabel || ''}`}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
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
};
