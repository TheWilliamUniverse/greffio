import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CreditCard, Smartphone } from 'lucide-react';
import { MolliePaymentTrustFooter } from '@/components/payments/MollieSecureTrustBadge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PaymentBrandBadges } from '@/components/layout/PaymentBrandBadges.jsx';
import { LegalAcceptanceCheckbox } from '@/components/payments/LegalAcceptanceCheckbox.jsx';
import { MollieCardForm } from '@/components/payments/MollieCardForm.jsx';
import { fetchMollieMethods, fetchPaymentTerminalConfig } from '@/api/mollie.js';
import { MOLLIE_PROFILE_ID } from '@/config/mollie.js';
import { cn } from '@/lib/utils.js';
import { isCapacitorNative, isMobileBrowserViewport } from '@/utils/platform.js';
import {
  pickDefaultConsumerPaymentMethod,
  resolvePaymentMethodHint,
  shouldRecommendWalletOnMobile,
  sortConsumerCheckoutMethods,
} from '@/utils/paymentMethods.js';
import paymentLogo from '../../../assets/payments/greffio-payment-logo.png';

const PAYMENT_GRADIENT_ONLY = 'linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(255,255,255,1) 55%, rgba(238,244,255,0.96) 100%)';
const PAYMENT_CARD_GRADIENT = 'linear-gradient(180deg, rgba(248,251,255,0.94) 0%, rgba(255,255,255,0.97) 55%, rgba(238,244,255,0.94) 100%)';

let paymentBackgroundUrlPromise;

const resolveDesktopPaymentBackgroundUrl = () => {
  if (!paymentBackgroundUrlPromise) {
    paymentBackgroundUrlPromise = import('../../../assets/payments/greffio-payment-background.png')
      .then((module) => module.default);
  }
  return paymentBackgroundUrlPromise;
};

const METHOD_ICONS = {
  creditcard: CreditCard,
  applepay: Smartphone,
  banktransfer: Building2,
};

const resolveMethodLabel = (method) => {
  if (method?.description) return method.description;
  if (method?.id === 'creditcard') return 'Carte bancaire';
  if (method?.id === 'googlepay') return 'Google Pay';
  if (method?.id === 'banktransfer') return 'Virement bancaire';
  return method?.id || 'Paiement';
};

export const GreffioPaymentTerminal = ({
  amountCents = 0,
  amountLabel,
  offerLabel = 'Greffio',
  onPay,
  isCreatingPayment = false,
  payButtonLabel = 'Payer en ligne',
  requireLegalAcceptance = true,
  variant = 'panel',
  showTrustFooter = true,
  className,
  mobileCheckout = false,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [methods, setMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState('creditcard');
  const [profileId, setProfileId] = useState(null);
  const [testmode, setTestmode] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [cardReady, setCardReady] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [cardBackgroundImage, setCardBackgroundImage] = useState(PAYMENT_GRADIENT_ONLY);
  const cardFormRef = useRef(null);
  const nativeApp = isCapacitorNative();
  const isCard = variant === 'card';

  useEffect(() => {
    if (isCapacitorNative() || isMobileBrowserViewport()) {
      setCardBackgroundImage(PAYMENT_GRADIENT_ONLY);
      return undefined;
    }

    let cancelled = false;
    void resolveDesktopPaymentBackgroundUrl()
      .then((url) => {
        if (cancelled || !url) return;
        setCardBackgroundImage(`${PAYMENT_CARD_GRADIENT}, url(${url})`);
      })
      .catch(() => {
        if (!cancelled) setCardBackgroundImage(PAYMENT_GRADIENT_ONLY);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingMethods(true);
      try {
        const [terminalPayload, methodsPayload] = await Promise.all([
          fetchPaymentTerminalConfig('b2c'),
          fetchMollieMethods({ amountCents, locale: 'fr_FR' }),
        ]);
        if (cancelled) return;
        const mollieConfig = terminalPayload?.terminal?.mollie
          || methodsPayload;
        setProfileId(
          mollieConfig?.profileId || methodsPayload?.profileId || MOLLIE_PROFILE_ID,
        );
        setTestmode(Boolean(mollieConfig?.testmode ?? methodsPayload?.testmode));
        const rawList = Array.isArray(methodsPayload?.methods) ? methodsPayload.methods : [];
        const list = sortConsumerCheckoutMethods(rawList);
        setMethods(list);
        setSelectedMethodId(pickDefaultConsumerPaymentMethod(list));
      } catch (_error) {
        if (!cancelled) {
          setProfileId(MOLLIE_PROFILE_ID);
          setMethods([{
            id: 'creditcard',
            description: 'Carte bancaire',
            checkoutMode: 'embedded',
          }]);
          setSelectedMethodId('creditcard');
        }
      } finally {
        if (!cancelled) setLoadingMethods(false);
      }
    };
    if (amountCents > 0) void load();
    return () => { cancelled = true; };
  }, [amountCents]);

  const selectedMethod = useMemo(
    () => methods.find((item) => item.id === selectedMethodId) || null,
    [methods, selectedMethodId],
  );
  const walletRecommendation = useMemo(
    () => shouldRecommendWalletOnMobile(methods),
    [methods],
  );
  const isMobilePay = isCapacitorNative() || isMobileBrowserViewport();
  const isEmbeddedCard = selectedMethodId === 'creditcard';
  const isHostedMethod = selectedMethod && selectedMethod.checkoutMode === 'hosted';
  const useCompactMobileCheckout = mobileCheckout && isMobilePay;
  const payDisabled = isCreatingPayment
    || !amountCents
    || (requireLegalAcceptance && !termsAccepted)
    || (isEmbeddedCard && !cardReady && !loadingMethods);

  const handlePay = async () => {
    setLocalError(null);
    try {
      let cardToken = null;
      if (isEmbeddedCard && cardFormRef.current) {
        const { token, error } = await cardFormRef.current.createToken();
        if (error || !token) {
          setLocalError(typeof error === 'string' ? error : 'Vérifiez les informations de carte.');
          return;
        }
        cardToken = token;
      }
      await onPay?.({
        method: selectedMethodId,
        cardToken,
        checkoutMode: cardToken ? 'embedded_3ds' : (isHostedMethod ? 'hosted' : 'embedded'),
      });
    } catch (error) {
      setLocalError(error?.message || 'Impossible d\'initialiser le paiement.');
    }
  };

  const paymentBody = (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold text-[hsl(var(--greffio-blue-900))]">Options de paiement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {offerLabel} – validation sur Greffio, puis confirmation sécurisée si votre banque l&apos;exige.
        </p>
      </div>

      {walletRecommendation && walletRecommendation !== selectedMethodId ? (
        <div className="rounded-xl border border-[#b9d0ef] bg-[#f8fbff] px-4 py-3 text-sm leading-6 text-muted-foreground">
          Sur mobile,{' '}
          <span className="font-semibold text-foreground">
            {walletRecommendation === 'applepay' ? 'Apple Pay' : 'Google Pay'}
          </span>
          {' '}est disponible pour un paiement plus rapide.
        </div>
      ) : null}

      <fieldset className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <legend className="sr-only">Moyen de paiement</legend>
        {methods.map((method) => {
          const Icon = METHOD_ICONS[method.id] || CreditCard;
          const active = method.id === selectedMethodId;
          const inputId = `greffio-payment-method-${method.id}`;
          return (
            <label
              key={method.id}
              htmlFor={inputId}
              className={cn(
                'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition',
                active
                  ? 'border-[hsl(var(--greffio-blue))] bg-white shadow-[0_8px_24px_rgba(30,77,140,0.08)]'
                  : 'border-border/80 bg-white hover:border-[#b9d0ef]',
              )}
            >
              <input
                id={inputId}
                type="radio"
                name="greffio-payment-method"
                value={method.id}
                checked={active}
                onChange={() => setSelectedMethodId(method.id)}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--greffio-blue))]"
              />
              {method.image?.svg || method.image?.size2x ? (
                <img
                  src={method.image.svg || method.image.size2x}
                  alt=""
                  className="h-6 w-auto shrink-0 object-contain"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--greffio-blue))]/10 text-[hsl(var(--greffio-blue))]">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-[hsl(var(--greffio-blue-900))] sm:text-base">
                  {resolveMethodLabel(method)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground sm:text-sm">
                  {resolvePaymentMethodHint(method.id)}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {isEmbeddedCard ? (
        <div className="space-y-4 rounded-2xl border border-[#dbe7f7] bg-white p-4 sm:p-5">
          <PaymentBrandBadges compact floating />
          {profileId ? (
            <MollieCardForm
              ref={cardFormRef}
              profileId={profileId}
              testmode={testmode}
              onReadyChange={setCardReady}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Chargement du formulaire carte…</p>
          )}
          {isMobilePay ? (
            <p className="rounded-lg bg-[#f8fbff] px-3 py-2 text-xs leading-5 text-muted-foreground">
              Votre banque peut demander une confirmation rapide avant de valider le paiement.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-[#dbe7f7] bg-[#f8fbff] px-4 py-4 text-sm leading-6 text-muted-foreground">
          {(() => {
            const HostedIcon = METHOD_ICONS[selectedMethodId] || CreditCard;
            return (
              <p className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--greffio-blue))]/10 text-[hsl(var(--greffio-blue))]">
                  <HostedIcon className="h-4 w-4" />
                </span>
                <span>
                  Vous serez redirigé vers la page sécurisée Mollie pour finaliser{' '}
                  <span className="font-semibold text-foreground">{resolveMethodLabel(selectedMethod)}</span>.
                </span>
              </p>
            );
          })()}
        </div>
      )}

      <div className={cn(
        'sticky bottom-0 z-10 space-y-3 rounded-2xl border border-[#dbe7f7] bg-white/95 p-4 backdrop-blur-sm',
        useCompactMobileCheckout
          ? '-mx-0 mb-[calc(0.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(10,18,32,0.08)]'
          : '-mx-1',
      )}>
        {requireLegalAcceptance ? (
          <LegalAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
        ) : null}

        {localError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {localError}
          </p>
        ) : null}

        <p className="text-center text-xs leading-5 text-muted-foreground">
          En validant le paiement, vous acceptez les{' '}
          <Link
            to="/mentions-legales#cgv"
            className="font-semibold text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            conditions générales de vente
          </Link>
          {' '}Greffio.
        </p>

        <Button
          type="button"
          className={cn(
            'h-12 w-full justify-between text-base font-bold',
            useCompactMobileCheckout ? 'rounded-full' : 'rounded-xl',
          )}
          onClick={() => void handlePay()}
          disabled={payDisabled}
        >
          {isCreatingPayment
            ? 'Traitement du paiement…'
            : `${payButtonLabel}${amountLabel ? ` – ${amountLabel}` : ''}`}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {showTrustFooter ? <MolliePaymentTrustFooter /> : null}
    </div>
  );

  if (!isCard) {
    return (
      <section className={cn('greffio-payment-terminal rounded-xl border border-border bg-white p-5 shadow-elevation-sm sm:p-6', className)}>
        {paymentBody}
      </section>
    );
  }

  return (
    <section
      className={cn(
        'greffio-payment-terminal relative mx-auto w-full max-w-2xl',
        useCompactMobileCheckout
          ? 'greffio-mobile-checkout-card overflow-hidden border-[#cfe0f5] p-0 shadow-[0_12px_40px_rgba(30,77,140,0.1)]'
          : 'rounded-[28px] border border-[#cfe0f5] shadow-[0_28px_80px_rgba(30,77,140,0.14)]',
        className,
      )}
      style={useCompactMobileCheckout ? undefined : {
        backgroundImage: cardBackgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      <div className={cn(
        'relative border-b border-white/70',
        useCompactMobileCheckout ? 'border-border/60 px-5 py-5' : 'px-5 py-6 sm:px-7',
      )}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {!useCompactMobileCheckout ? (
              <div className="mb-3 flex items-center gap-3">
                <img src={paymentLogo} alt="" aria-hidden className="h-8 w-auto" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Paiement sécurisé</p>
              </div>
            ) : (
              <p className="greffio-mobile-checkout-meta mb-2 text-primary">Terminal de paiement</p>
            )}
            <h2 className="text-lg font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] sm:text-2xl">
              Régler en toute sécurité
            </h2>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-center sm:min-w-[180px] sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Montant TTC</p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))] sm:text-3xl">{amountLabel || '–'}</p>
          </div>
        </div>
      </div>

      <div className={cn('relative', useCompactMobileCheckout ? 'px-5 py-5' : 'px-5 py-6 sm:px-7')}>
        {paymentBody}
      </div>
    </section>
  );
};
