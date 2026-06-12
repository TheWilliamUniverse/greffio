import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { createAmazonPaySession, getAmazonPayConfig } from '@/api/payments.js';
import { cn } from '@/lib/utils.js';

let amazonPayScriptPromise = null;

const loadAmazonPayScript = (scriptUrl) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('WINDOW_UNAVAILABLE'));
  if (window.amazon?.Pay) return Promise.resolve();
  if (amazonPayScriptPromise) return amazonPayScriptPromise;
  amazonPayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('AMAZON_PAY_SCRIPT_LOAD_FAILED'));
    document.head.appendChild(script);
  });
  return amazonPayScriptPromise;
};

export const AmazonPayCheckoutPanel = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  dossierId,
  resourceOrderId,
  offerCode,
  className,
}) => {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const renderAmazonPay = async () => {
      setLoading(true);
      setError('');
      try {
        const configPayload = await getAmazonPayConfig();
        const publicConfig = configPayload?.config || {};
        if (cancelled) return;
        setConfig(publicConfig);
        if (!publicConfig.enabled) {
          setError('Amazon Pay est prêt côté interface, mais les variables serveur ne sont pas encore complètes.');
          return;
        }
        if (!amountCents) {
          setError('Montant indisponible pour Amazon Pay.');
          return;
        }
        const sessionPayload = await createAmazonPaySession({
          dossierId,
          resourceOrderId,
          offerCode,
        });
        await loadAmazonPayScript(publicConfig.scriptUrl);
        if (cancelled || !buttonRef.current || !window.amazon?.Pay) return;
        buttonRef.current.innerHTML = '';
        window.amazon.Pay.renderButton(buttonRef.current, {
          merchantId: publicConfig.merchantId,
          ledgerCurrency: publicConfig.ledgerCurrency || 'EUR',
          sandbox: Boolean(publicConfig.sandbox),
          checkoutLanguage: publicConfig.checkoutLanguage || 'fr_FR',
          productType: 'PayOnly',
          placement: 'Checkout',
          buttonColor: 'Gold',
          createCheckoutSessionConfig: sessionPayload.createCheckoutSessionConfig,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err?.payload?.error || err?.message || 'Amazon Pay indisponible pour le moment.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void renderAmazonPay();
    return () => {
      cancelled = true;
    };
  }, [amountCents, dossierId, offerCode, resourceOrderId]);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#d4e2f5] bg-gradient-to-br from-white via-[#f7faff] to-[#edf4ff] p-5 shadow-[0_12px_32px_rgba(30,77,140,0.08)]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--greffio-blue))] text-white shadow-sm">
          <WalletCards className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Wallet sécurisé</p>
            {config?.sandbox ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Sandbox
              </span>
            ) : (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Live
              </span>
            )}
          </div>
          <h2 className="mt-0.5 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">Amazon Pay</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Payez avec votre compte Amazon. La session est signée par Greffio et aucune donnée de paiement n&apos;est stockée sur nos serveurs.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/80 bg-white/90 px-4 py-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Montant</p>
        <p className="mt-0.5 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel || 'Montant TTC'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{offerLabel}</p>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Préparation Amazon Pay…
          </div>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
        ) : null}
        <div ref={buttonRef} className={cn('min-h-12', (loading || error) && 'hidden')} />
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Retour autorisé : https://greffio.willentreprises.com/paiement/amazon-pay/retour
        </span>
      </div>
    </section>
  );
};
