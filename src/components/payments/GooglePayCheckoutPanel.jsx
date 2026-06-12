import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useGooglePay } from '@/hooks/useGooglePay.js';
import { processGooglePayPayment } from '@/api/payments.js';
import { cn } from '@/lib/utils.js';

const GooglePayMark = () => (
  <svg viewBox="0 0 120 36" aria-hidden="true" className="h-7 w-auto">
    <rect width="120" height="36" rx="6" fill="#000" />
    <text x="14" y="23" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">G</text>
    <text x="28" y="23" fill="#fff" fontSize="11" fontWeight="600" fontFamily="Arial, sans-serif">Pay</text>
  </svg>
);

export const GooglePayCheckoutPanel = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  dossierId,
  resourceOrderId,
  offerCode,
  className,
  onSuccess,
  hideWhenUnavailable = false,
}) => {
  const buttonRef = useRef(null);
  const { ready, error, config, client, isReadyToPay, pay } = useGooglePay({
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

  useEffect(() => {
    if (!ready || !canPay || !client || !buttonRef.current || submitting) return undefined;
    buttonRef.current.innerHTML = '';
    try {
      const googleButton = client.createButton({
        onClick: () => { void handlePay(); },
        buttonColor: 'black',
        buttonType: 'pay',
        buttonSizeMode: 'fill',
      });
      buttonRef.current.appendChild(googleButton);
    } catch {
      buttonRef.current.innerHTML = '';
    }
    return () => {
      if (buttonRef.current) buttonRef.current.innerHTML = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, canPay, client, amountCents, submitting]);

  if (hideWhenUnavailable && error && !ready) return null;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#d4e2f5] bg-gradient-to-br from-white via-[#f4f8ff] to-[#eef4fb] p-5 shadow-[0_12px_32px_rgba(30,77,140,0.08)]',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <GooglePayMark />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Paiement express</p>
            {ready && isTestEnvironment ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Pré-production
              </span>
            ) : null}
          </div>
          <h3 className="mt-0.5 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">Google Pay</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Réglez en un geste avec vos cartes enregistrées dans Google Pay.
          </p>
        </div>
      </div>

      {amountLabel ? (
        <div className="mt-4 rounded-xl border border-white/80 bg-white/90 px-4 py-3 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Montant</p>
          <p className="mt-0.5 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col items-center gap-3">
        {!ready && !error ? (
          <div className="flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-xl bg-white text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Préparation Google Pay…
          </div>
        ) : null}

        {error ? (
          <p className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 sm:text-left">{error}</p>
        ) : null}

        <div
          ref={buttonRef}
          className={cn(
            'mx-auto min-h-[48px] w-full max-w-[320px]',
            (!ready || !canPay || error) && 'hidden',
          )}
        />

        {submitting ? (
          <div className="flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-xl bg-white text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Traitement sécurisé…
          </div>
        ) : null}

        {ready && !canPay && !error ? (
          <p className="w-full rounded-xl border border-border bg-white px-4 py-3 text-center text-sm text-muted-foreground sm:text-left">
            Google Pay n&apos;est pas disponible sur cet appareil ou ce navigateur.
            Utilisez Amazon Pay ou la carte bancaire.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground sm:justify-start sm:text-left">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>Confirmation serveur Greffio avant validation de la commande.</span>
      </div>
    </section>
  );
};
