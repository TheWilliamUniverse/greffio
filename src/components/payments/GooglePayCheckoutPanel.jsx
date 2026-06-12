import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { useGooglePay } from '@/hooks/useGooglePay.js';
import { processGooglePayPayment } from '@/api/payments.js';
import { cn } from '@/lib/utils.js';

export const GooglePayCheckoutPanel = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  dossierId,
  resourceOrderId,
  offerCode,
  className,
  onSuccess,
}) => {
  const { ready, error, config, isReadyToPay, pay } = useGooglePay({
    amountCents,
    label: offerLabel,
  });
  const isTestEnvironment = config?.environment !== 'PRODUCTION';
  const [canPay, setCanPay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    void isReadyToPay().then((value) => {
      if (!cancelled) setCanPay(value);
    });
    return () => { cancelled = true; };
  }, [ready, isReadyToPay]);

  const handlePay = async () => {
    try {
      setSubmitting(true);
      const paymentData = await pay();
      const payload = await processGooglePayPayment({
        dossierId,
        resourceOrderId,
        offerCode,
        paymentData,
      });
      if (payload.redirectUrl) {
        window.location.href = payload.redirectUrl;
        return;
      }
      onSuccess?.(payload);
      toast.success('Paiement Google Pay enregistré.');
    } catch (err) {
      if (err?.statusCode === 'CANCELED') return;
      toast.error(err?.message || 'Le paiement Google Pay a échoué.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#d4e2f5] bg-gradient-to-br from-white via-[#f4f8ff] to-[#eef4fb] p-5 shadow-[0_12px_32px_rgba(30,77,140,0.08)]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--greffio-blue))] text-white shadow-sm">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Paiement express</p>
            {ready && isTestEnvironment ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Pré-production
              </span>
            ) : null}
          </div>
          <h2 className="mt-0.5 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">Google Pay</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Réglez en un geste. Vos cartes enregistrées dans Google Pay — chiffrement TLS et confirmation serveur Greffio.
          </p>
        </div>
      </div>

      {amountLabel ? (
        <div className="mt-4 rounded-xl border border-white/80 bg-white/90 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Montant</p>
          <p className="mt-0.5 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {!ready && !error ? (
          <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Préparation Google Pay…
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
        ) : null}

        {ready && canPay ? (
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-[#000] text-base font-bold text-white hover:bg-[#1a1a1a]"
            disabled={submitting || !amountCents}
            onClick={() => void handlePay()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Traitement sécurisé…
              </>
            ) : (
              <>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-white text-[10px] font-black text-[#4285F4]">G</span>
                Payer avec Google Pay
              </>
            )}
          </Button>
        ) : null}

        {ready && canPay ? (
          <p className="text-center text-xs text-muted-foreground">
            Visa · Mastercard — montant débité : {amountLabel || 'montant TTC'}
          </p>
        ) : null}

        {ready && !canPay && !error ? (
          <p className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
            Google Pay n&apos;est pas disponible sur cet appareil ou ce navigateur.
            Utilisez le paiement par carte bancaire ci-dessous.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Paiement traité via notre prestataire sécurisé (CAWL en cours de branchement). Aucune donnée carte n&apos;est stockée sur Greffio.
        </span>
      </div>
    </section>
  );
};
