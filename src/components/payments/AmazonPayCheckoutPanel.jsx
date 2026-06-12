import React, { useEffect, useId, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
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

const AmazonPayMark = () => (
  <svg viewBox="0 0 120 36" aria-hidden="true" className="h-7 w-auto">
    <rect width="120" height="36" rx="6" fill="#FF9900" />
    <text x="12" y="23" fill="#111827" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">amazon</text>
    <text x="68" y="23" fill="#111827" fontSize="11" fontWeight="700" fontFamily="Arial, sans-serif">pay</text>
  </svg>
);

export const AmazonPayCheckoutPanel = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  dossierId,
  resourceOrderId,
  offerCode,
  className,
  hideWhenUnavailable = false,
}) => {
  const buttonContainerId = useId().replace(/:/g, '');
  const buttonSelector = `#${buttonContainerId}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buttonReady, setButtonReady] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const renderAmazonPay = async () => {
      setLoading(true);
      setError('');
      setButtonReady(false);
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
        const checkoutConfig = sessionPayload?.createCheckoutSessionConfig || {};
        if (!checkoutConfig.payloadJSON || !checkoutConfig.signature) {
          setError('Session Amazon Pay incomplète. Réessayez ou utilisez la carte bancaire.');
          return;
        }
        await loadAmazonPayScript(publicConfig.scriptUrl);
        if (cancelled) return;
        setLoading(false);
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
        const buttonHost = document.getElementById(buttonContainerId);
        if (cancelled || !buttonHost || !window.amazon?.Pay) {
          setError('Le script Amazon Pay n’a pas pu s’initialiser.');
          return;
        }
        buttonHost.innerHTML = '';
        try {
          window.amazon.Pay.renderButton(buttonSelector, {
            merchantId: publicConfig.merchantId,
            publicKeyId: publicConfig.publicKeyId,
            ledgerCurrency: publicConfig.ledgerCurrency || 'EUR',
            sandbox: Boolean(publicConfig.sandbox),
            checkoutLanguage: publicConfig.checkoutLanguage || 'fr_FR',
            productType: 'PayOnly',
            placement: 'Checkout',
            buttonColor: 'Gold',
            estimatedOrderAmount: {
              amount: (Math.max(0, amountCents) / 100).toFixed(2),
              currencyCode: publicConfig.ledgerCurrency || 'EUR',
            },
            createCheckoutSessionConfig: {
              payloadJSON: checkoutConfig.payloadJSON,
              signature: checkoutConfig.signature,
              algorithm: checkoutConfig.algorithm || 'AMZN-PAY-RSASSA-PSS-V2',
            },
          });
        } catch (renderError) {
          setError(renderError?.message || 'Impossible d’afficher le bouton Amazon Pay.');
          return;
        }
        if (!cancelled) setButtonReady(true);
      } catch (err) {
        if (!cancelled) {
          const reason = err?.payload?.error || err?.message;
          if (reason === 'AUTH_REQUIRED' || err?.status === 401) {
            setError('Connectez-vous à votre espace Greffio pour payer avec Amazon Pay.');
          } else {
            setError(
              reason === 'AMAZON_PAY_NOT_CONFIGURED'
                ? 'Amazon Pay attend encore les variables serveur et la clé privée sur le VPS.'
                : reason || 'Amazon Pay indisponible pour le moment. Vous pouvez régler par carte bancaire.',
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void renderAmazonPay();
    return () => {
      cancelled = true;
    };
  }, [amountCents, buttonContainerId, buttonSelector, dossierId, offerCode, resourceOrderId]);

  if (hideWhenUnavailable && error && !loading && !buttonReady) return null;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-[#d4e2f5] bg-gradient-to-br from-white via-[#fffaf0] to-[#fff4df] p-5 shadow-[0_12px_32px_rgba(30,77,140,0.08)]',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <AmazonPayMark />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Recommandé</p>
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
          <h3 className="mt-0.5 text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">Amazon Pay</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Payez avec votre compte Amazon. Session signée par Greffio, sans stockage de vos données de paiement.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/80 bg-white/90 px-4 py-3 text-center sm:text-left">
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
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 sm:text-left">{error}</p>
        ) : null}
        <div
          id={buttonContainerId}
          className={cn(
            'mx-auto flex min-h-[48px] w-full max-w-[320px] items-center justify-center',
            error && 'hidden',
          )}
        />
      </div>

      <div className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground sm:justify-start sm:text-left">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>Paiement chiffré TLS — retour sécurisé vers Greffio après validation Amazon.</span>
      </div>
    </section>
  );
};
