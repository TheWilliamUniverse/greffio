import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
  hideWhenUnavailable = false,
  embedded = false,
  active = true,
}) => {
  const buttonContainerId = useId().replace(/:/g, '');
  const buttonRef = useRef(null);
  const { ready, error, config, client, isReadyToPay, pay } = useGooglePay({
    amountCents,
    label: offerLabel,
    active,
  });
  const [canPay, setCanPay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!active || !ready) return undefined;
    let cancelled = false;
    void isReadyToPay().then((value) => {
      if (!cancelled) setCanPay(value);
    });
    return () => { cancelled = true; };
  }, [active, ready, isReadyToPay]);

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
      const code = String(err?.statusCode || err?.message || '');
      if (code.includes('OR_BIBED')) {
        toast.error('Google Pay n’est pas encore configuré pour encaisser en live. Utilisez la carte bancaire.');
      } else {
        toast.error(err?.message || 'Le paiement Google Pay a échoué.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!active || !ready || !canPay || !client || submitting) return undefined;
    const host = document.getElementById(buttonContainerId);
    if (!host) return undefined;
    host.innerHTML = '';
    try {
      const googleButton = client.createButton({
        onClick: () => { void handlePay(); },
        buttonColor: 'black',
        buttonType: 'pay',
        buttonSizeMode: 'fill',
      });
      host.appendChild(googleButton);
    } catch {
      host.innerHTML = '';
    }
    return () => {
      if (host) host.innerHTML = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, buttonContainerId, canPay, client, ready, submitting]);

  if (!active) return null;
  if (hideWhenUnavailable && error && !ready) return null;

  const body = (
    <>
      {!embedded ? (
        <div className="mb-4 rounded-xl border border-white/80 bg-white/90 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Montant</p>
          <p className="mt-0.5 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel}</p>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Paiement tokenisé puis confirmation serveur Greffio.
          </p>
        </div>
      )}

      {!ready && !error ? (
        <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f4f8ff] text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Préparation Google Pay…
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
      ) : null}

      <div
        id={buttonContainerId}
        ref={buttonRef}
        className={cn(
          'mx-auto min-h-[48px] w-full max-w-[340px]',
          (!ready || !canPay || error || submitting) && 'hidden',
        )}
      />

      {submitting ? (
        <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Traitement sécurisé…
        </div>
      ) : null}

      {ready && !canPay && !error ? (
        <p className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
          Google Pay n&apos;est pas disponible sur cet appareil. Utilisez la carte bancaire.
        </p>
      ) : null}
    </>
  );

  if (embedded) return body;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#d4e2f5] bg-gradient-to-br from-white via-[#f4f8ff] to-[#eef4fb] p-5 shadow-[0_12px_32px_rgba(30,77,140,0.08)]',
        className,
      )}
    >
      {body}
    </section>
  );
};
