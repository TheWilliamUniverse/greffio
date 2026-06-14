import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Building2, CreditCard, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { PaymentBrandBadges } from '@/components/layout/PaymentBrandBadges.jsx';
import { LegalAcceptanceCheckbox } from '@/components/payments/LegalAcceptanceCheckbox.jsx';
import { MollieCardForm } from '@/components/payments/MollieCardForm.jsx';
import { fetchMollieMethods, fetchPaymentTerminalConfig } from '@/api/mollie.js';
import { MOLLIE_PROFILE_ID } from '@/config/mollie.js';
import { cn } from '@/lib/utils.js';
import { isCapacitorNative } from '@/utils/platform.js';
import paymentBackground from '../../../assets/payments/greffio-payment-background.png';
import paymentLogo from '../../../assets/payments/greffio-payment-logo.png';

const METHOD_ICONS = {
  creditcard: CreditCard,
  applepay: Smartphone,
  banktransfer: Building2,
};

const resolveMethodLabel = (method) => {
  if (method?.description) return method.description;
  if (method?.id === 'creditcard') return 'Carte bancaire';
  if (method?.id === 'applepay') return 'Apple Pay';
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
  className,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [methods, setMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState('creditcard');
  const [profileId, setProfileId] = useState(null);
  const [testmode, setTestmode] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [cardReady, setCardReady] = useState(false);
  const [localError, setLocalError] = useState(null);
  const cardFormRef = useRef(null);
  const nativeApp = isCapacitorNative();

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
        const list = Array.isArray(methodsPayload?.methods) ? methodsPayload.methods : [];
        setMethods(list);
        const preferred = list.find((item) => item.id === 'creditcard')
          || list.find((item) => item.checkoutMode === 'embedded')
          || list[0];
        if (preferred?.id) setSelectedMethodId(preferred.id);
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
  const isEmbeddedCard = selectedMethodId === 'creditcard';
  const isHostedMethod = selectedMethod && selectedMethod.checkoutMode === 'hosted';
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

  return (
    <section
      className={cn(
        'relative mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#cfe0f5]',
        'shadow-[0_28px_80px_rgba(30,77,140,0.14)]',
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,251,255,0.94) 0%, rgba(255,255,255,0.97) 55%, rgba(238,244,255,0.94) 100%), url(${paymentBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      <div className="relative border-b border-white/70 px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <img
                src={paymentLogo}
                alt=""
                aria-hidden
                className="h-8 w-auto"
              />
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Paiement sécurisé</p>
            </div>
            <h2 className="text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">
              Régler en toute sécurité
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {offerLabel} – choisissez votre moyen de paiement. Carte intégrée Greffio ou redirection Mollie selon la méthode.
            </p>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-center sm:min-w-[180px] sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Montant TTC</p>
            <p className="mt-0.5 text-3xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{amountLabel || '–'}</p>
          </div>
        </div>
      </div>

      <div className="relative space-y-4 px-5 py-6 sm:px-7">
        {methods.length > 1 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {methods.map((method) => {
              const Icon = METHOD_ICONS[method.id] || CreditCard;
              const active = method.id === selectedMethodId;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethodId(method.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                    active
                      ? 'border-[hsl(var(--greffio-blue))] bg-white shadow-[0_12px_32px_rgba(30,77,140,0.08)]'
                      : 'border-[#dbe7f7] bg-white/80 hover:border-[#b9d0ef]',
                  )}
                >
                  {method.image?.svg || method.image?.size2x ? (
                    <img
                      src={method.image.svg || method.image.size2x}
                      alt=""
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--greffio-blue))]/10 text-[hsl(var(--greffio-blue))]">
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-[hsl(var(--greffio-blue-900))]">
                      {resolveMethodLabel(method)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {method.checkoutMode === 'embedded' ? 'Formulaire Greffio' : 'Page sécurisée Mollie'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#dbe7f7] bg-white px-4 py-5 shadow-[0_12px_32px_rgba(30,77,140,0.06)] sm:px-5">
          {isEmbeddedCard ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--greffio-blue))] text-white">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">Carte bancaire</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Saisie sécurisée Mollie Components – données carte jamais stockées chez Greffio.
                  </p>
                  <div className="mt-4">
                    <PaymentBrandBadges compact />
                  </div>
                </div>
              </div>
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
              {nativeApp ? (
                <p className="rounded-xl bg-[#f8fbff] px-3 py-2 text-xs leading-5 text-muted-foreground">
                  Sur l&apos;app mobile, la vérification 3-D Secure s&apos;ouvre dans le navigateur système puis vous ramène dans Greffio.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              {(() => {
                const HostedIcon = METHOD_ICONS[selectedMethodId] || CreditCard;
                return (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--greffio-blue))] text-white">
                      <HostedIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-extrabold text-[hsl(var(--greffio-blue-900))]">
                        {resolveMethodLabel(selectedMethod)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Vous serez redirigé vers la page sécurisée Mollie pour finaliser ce moyen de paiement.
                        {nativeApp ? ' Sur mobile, le navigateur système s\'ouvrira automatiquement.' : ''}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {requireLegalAcceptance ? (
          <LegalAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
        ) : null}

        {localError ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {localError}
          </p>
        ) : null}

        <Button
          type="button"
          className="h-12 w-full justify-between rounded-xl text-base font-bold"
          onClick={() => void handlePay()}
          disabled={payDisabled}
        >
          {isCreatingPayment
            ? 'Traitement du paiement…'
            : `${payButtonLabel}${amountLabel ? ` – ${amountLabel}` : ''}`}
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
