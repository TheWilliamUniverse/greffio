import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { checkoutDossierPayment } from '@/api/payments.js';
import { inferCustomerType } from '@/utils/customerType.js';
import { checkoutResourceOrder, checkoutCartPayment, getResourceOrder } from '@/api/resources.js';
import { formatResourcePrice, getCatalogItemById, getProcessingLabel } from '@/config/resourceServices.js';
import { GreffioPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
import { formatEuroCents, resolveOfferAmountCents } from '@/config/paymentOffers.js';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { OfflineDataBanner } from '@/components/system/OfflineDataBanner.jsx';
import { resolvePaymentCheckoutErrorMessage } from '@/utils/paymentErrors.js';
import { openPaymentCheckoutUrl } from '@/utils/paymentCheckoutNavigation.js';
import { formatOrderPublicReference } from '@/utils/orderReference.js';

const offers = {
  'Statuts gratuits': { title: 'Statuts gratuits', price: '0€', tax: 'Aucun paiement requis' },
  'Dossier gratuit': { title: 'Statuts gratuits', price: '0€', tax: 'Aucun paiement requis' },
  'Dossier Standard': { title: 'Dossier Standard', price: '99€ HT', tax: 'TVA calculée au paiement' },
  'Équipe Greffio Premium': { title: 'Équipe Greffio Premium', price: '199€ HT', tax: 'TVA calculée au paiement' },
  'jeune-entrepreneur': { title: 'Offre Jeune Entrepreneur.e', price: '70€', tax: 'TVA calculée au paiement' },
  Formalité: { title: 'Formalité', price: '149€', tax: 'TVA calculée au paiement' },
};

export const MobilePaymentPage = () => {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const offerName = searchParams.get('offer') || 'Dossier Standard';
  const service = searchParams.get('service') || 'creation';
  const resourceOrderId = searchParams.get('resourceOrder');
  const cartOrdersParam = searchParams.get('cartOrders');
  const cartOrderIds = useMemo(
    () => (cartOrdersParam ? cartOrdersParam.split(',').map((id) => id.trim()).filter(Boolean) : []),
    [cartOrdersParam],
  );
  const pspStatus = searchParams.get('status');
  const selectedOffer = offers[offerName] || offers['Dossier Standard'];
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [resourceOrder, setResourceOrder] = useState(null);
  const [cartOrders, setCartOrders] = useState([]);
  const [loadingResourceOrder, setLoadingResourceOrder] = useState(Boolean(resourceOrderId || cartOrderIds.length));
  const { data: dossiers = [], isLoading: dossiersLoading, isError: dossiersError, dataUpdatedAt } = useDossiersQuery(currentUser?.id);

  const activeDossier = useMemo(() => {
    const dossierId = getCurrentDossierId();
    if (!dossierId) return null;
    return dossiers.find((item) => item.id === dossierId) || null;
  }, [dossiers]);

  const customerType = useMemo(
    () => inferCustomerType(currentUser, activeDossier),
    [currentUser, activeDossier],
  );

  const catalogService = resourceOrder?.serviceId
    ? getCatalogItemById(resourceOrder.serviceId)
    : getCatalogItemById(service);
  const resourceLanding = !resourceOrderId
    && catalogService
    && ['document', 'pack', 'service'].includes(catalogService.kind)
    ? catalogService
    : null;
  const isCartFlow = cartOrderIds.length > 0;
  const isResourceFlow = Boolean(resourceOrderId || resourceLanding || isCartFlow);
  const orderReference = formatOrderPublicReference(resourceOrder)
    || (cartOrders[0] ? formatOrderPublicReference(cartOrders[0]) : null);

  useEffect(() => {
    if (!resourceOrderId && !cartOrderIds.length) {
      setLoadingResourceOrder(false);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        if (cartOrderIds.length) {
          const loaded = await Promise.all(cartOrderIds.map((id) => getResourceOrder(id)));
          if (!cancelled) {
            setCartOrders(loaded.map((payload) => payload.order).filter(Boolean));
            setResourceOrder(null);
          }
          return;
        }
        const payload = await getResourceOrder(resourceOrderId);
        if (!cancelled) setResourceOrder(payload.order);
      } catch (_error) {
        if (!cancelled) toast.error('Commande introuvable ou accès refusé.');
      } finally {
        if (!cancelled) setLoadingResourceOrder(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [resourceOrderId, cartOrderIds]);

  const handleCheckout = async ({ method, cardToken } = {}) => {
    try {
      setIsCreatingPayment(true);
      if (isCartFlow) {
        const payload = await checkoutCartPayment({
          orderIds: cartOrderIds,
          mollieMethod: method,
          cardToken,
        });
        if (payload.checkoutUrl) {
          await openPaymentCheckoutUrl(payload.checkoutUrl, { checkoutMode: payload.checkoutMode });
          return;
        }
        throw new Error('CHECKOUT_URL_MISSING');
      }
      if (resourceOrderId) {
        const payload = await checkoutResourceOrder(resourceOrderId, { mollieMethod: method, cardToken });
        if (payload.checkoutUrl) {
          await openPaymentCheckoutUrl(payload.checkoutUrl, { checkoutMode: payload.checkoutMode });
          return;
        }
        throw new Error('CHECKOUT_URL_MISSING');
      }
      const dossierId = getCurrentDossierId();
      if (!dossierId) {
        toast.error('Aucun dossier actif. Créez votre compte ou dossier avant le paiement.');
        return;
      }
      const payload = await checkoutDossierPayment({
        dossierId,
        offerCode: offerName,
        customerType,
        mollieMethod: method,
        cardToken,
      });
      if (payload.checkoutUrl) {
        await openPaymentCheckoutUrl(payload.checkoutUrl, { checkoutMode: payload.checkoutMode });
        return;
      }
      throw new Error('CHECKOUT_URL_MISSING');
    } catch (error) {
      toast.error(resolvePaymentCheckoutErrorMessage(error));
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (dossiersLoading && !resourceOrderId) return <MobilePageSkeleton />;

  const resourcePriceLabel = isCartFlow
    ? `${(cartOrders.reduce((sum, order) => sum + Number(order.priceTtc || 0), 0)).toFixed(2).replace('.', ',')} € TTC`
    : resourceOrder
      ? `${Number(resourceOrder.priceTtc || 0).toFixed(2).replace('.', ',')} € TTC`
      : null;
  const amountCents = isCartFlow
    ? cartOrders.reduce((sum, order) => sum + Math.round(Number(order.priceTtc || 0) * 100), 0)
    : resourceOrder
      ? Math.round(Number(resourceOrder.priceTtc || 0) * 100)
      : resourceLanding
        ? 0
        : resolveOfferAmountCents(offerName);
  const amountLabel = isCartFlow || resourceOrder ? resourcePriceLabel : formatEuroCents(amountCents);
  const terminalOfferLabel = isCartFlow
    ? `Panier boutique (${cartOrders.length} article${cartOrders.length > 1 ? 's' : ''})`
    : resourceOrder?.serviceTitle || selectedOffer.title;

  const pageTitle = isCartFlow
    ? `Panier (${cartOrders.length} article${cartOrders.length > 1 ? 's' : ''})`
    : resourceOrder
      ? resourceOrder.serviceTitle
      : resourceLanding
        ? resourceLanding.title
        : selectedOffer.title;

  return (
    <MobilePageContainer
      hasBottomNav={false}
      className="greffio-mobile-checkout [--mobile-page-bottom-extra:1.25rem] space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
    >
      {pspStatus === 'paid' ? (
        <div className="greffio-mobile-checkout-card border-emerald-200 bg-emerald-50 text-base text-emerald-900">
          <CheckCircle2 className="mb-2 h-5 w-5" />
          Paiement confirmé. Votre dossier sera mis à jour sous quelques instants.
          <Button asChild className="mt-4 h-12 w-full rounded-full text-base font-bold">
            <Link to="/dashboard">Retour à l’accueil</Link>
          </Button>
        </div>
      ) : null}

      {pspStatus === 'failed' || pspStatus === 'cancelled' ? (
        <div className="greffio-mobile-checkout-card border-amber-200 bg-amber-50 text-base text-amber-900">
          Le paiement n’a pas abouti. Vous pouvez réessayer en toute sécurité.
        </div>
      ) : null}

      {dossiersError ? <OfflineDataBanner cachedAt={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null} /> : null}

      <section className="greffio-mobile-checkout-hero">
        <p className="greffio-mobile-checkout-meta">Paiement sécurisé</p>
        <h1 className="greffio-mobile-checkout-title mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {pageTitle}
        </h1>
        <p className="greffio-mobile-checkout-amount mt-3">
          {resourceOrder
            ? resourcePriceLabel
            : resourceLanding
              ? formatResourcePrice(resourceLanding.priceTtc)
              : selectedOffer.price}
        </p>
        <p className="greffio-mobile-checkout-body mt-2 text-white/85">
          {resourceOrder || resourceLanding ? 'Commande document – TVA incluse' : selectedOffer.tax}
        </p>
        {orderReference ? (
          <p className="greffio-mobile-checkout-meta mt-2 normal-case tracking-normal text-white/80">{orderReference}</p>
        ) : null}
      </section>

      {isResourceFlow && (resourceOrder || isCartFlow) ? (
        <section className="greffio-mobile-checkout-card">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <p className="text-lg font-extrabold tracking-tight text-[hsl(var(--greffio-blue-900))]">Récapitulatif</p>
          </div>
          {isCartFlow ? (
            <ul className="space-y-2 text-base text-muted-foreground">
              {cartOrders.map((order) => (
                <li key={order.id} className="flex justify-between gap-3">
                  <span>{order.serviceTitle}</span>
                  <span className="shrink-0 font-semibold text-foreground">
                    {`${Number(order.priceTtc || 0).toFixed(2).replace('.', ',')} €`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="greffio-mobile-checkout-body space-y-1 text-muted-foreground">
              {resourceOrder.companyName ? (
                <p>{resourceOrder.companyName}</p>
              ) : null}
              {catalogService?.estimatedDelay ? (
                <p className="text-sm">Délai : {catalogService.estimatedDelay}</p>
              ) : null}
              {catalogService ? (
                <p className="text-sm">{getProcessingLabel(catalogService)}</p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      <section className="greffio-mobile-checkout-card greffio-mobile-checkout-body text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 text-base font-extrabold text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Paiement sécurisé
        </div>
        Sur l’application, le paiement s’ouvre dans le navigateur sécurisé de votre téléphone.
        Après validation, vous revenez automatiquement dans Greffio pour la confirmation.
      </section>

      {resourceLanding ? (
        <div className="greffio-mobile-checkout-card border-amber-200 bg-amber-50 text-base text-amber-900">
          Indiquez d’abord l’entreprise concernée (SIREN, dénomination) pour finaliser cette commande.
          <Button asChild className="mt-4 h-12 w-full rounded-full text-base font-bold">
            <Link to={currentUser ? '/boutique' : '/ressources'}>
              Compléter ma commande
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : null}

      {loadingResourceOrder && resourceOrderId ? (
        <PageLoadingState
          compact
          label="Chargement de la commande…"
          description="Préparation du terminal de paiement."
        />
      ) : null}

      {currentUser && amountCents > 0 && !loadingResourceOrder && !resourceLanding ? (
        <GreffioPaymentTerminal
          variant="card"
          amountCents={amountCents}
          amountLabel={amountLabel}
          offerLabel={terminalOfferLabel}
          onPay={handleCheckout}
          isCreatingPayment={isCreatingPayment}
          payButtonLabel="Payer en ligne"
          className="mb-1"
          mobileCheckout
        />
      ) : null}

      {!currentUser ? (
        <Button asChild variant="outline" className="h-12 w-full rounded-full bg-white text-base font-semibold">
          <Link to={`/signup?service=${service}`}>Créer un compte d’abord</Link>
        </Button>
      ) : null}

      {resourceOrder ? (
        <Button asChild variant="ghost" className="h-12 w-full text-base font-semibold">
          <Link to="/boutique/commandes">Mes commandes</Link>
        </Button>
      ) : null}

      <Button asChild variant="ghost" className="h-12 w-full text-base font-semibold">
        <Link to={resourceOrder || resourceLanding ? '/boutique' : '/tarifs'}>Retour</Link>
      </Button>
    </MobilePageContainer>
  );
};
