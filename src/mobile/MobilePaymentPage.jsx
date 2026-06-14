import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';
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
          await openPaymentCheckoutUrl(payload.checkoutUrl);
          return;
        }
        throw new Error('CHECKOUT_URL_MISSING');
      }
      if (resourceOrderId) {
        const payload = await checkoutResourceOrder(resourceOrderId, { mollieMethod: method, cardToken });
        if (payload.checkoutUrl) {
          await openPaymentCheckoutUrl(payload.checkoutUrl);
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
        await openPaymentCheckoutUrl(payload.checkoutUrl);
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

  return (
    <MobilePageContainer>
      {pspStatus === 'paid' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mb-2 h-5 w-5" />
          Paiement confirmé. Votre dossier sera mis à jour sous quelques instants.
          <Button asChild className="mt-3 h-11 w-full">
            <Link to="/dashboard">Retour à l’accueil</Link>
          </Button>
        </div>
      ) : null}

      {pspStatus === 'failed' || pspStatus === 'cancelled' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Le paiement n’a pas abouti. Vous pouvez réessayer en toute sécurité.
        </div>
      ) : null}

      {dossiersError ? <OfflineDataBanner cachedAt={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null} /> : null}

      <section className="rounded-2xl bg-[hsl(var(--greffio-blue))] p-5 text-white shadow-lg">
        <p className="text-xs font-bold uppercase text-white/70">Paiement sécurisé</p>
        <h1 className="mt-2 text-2xl font-extrabold">
          {isCartFlow
            ? `Panier (${cartOrders.length} article${cartOrders.length > 1 ? 's' : ''})`
            : resourceOrder
              ? resourceOrder.serviceTitle
              : resourceLanding
                ? resourceLanding.title
                : selectedOffer.title}
        </h1>
        <p className="mt-3 text-3xl font-extrabold">
          {resourceOrder
            ? resourcePriceLabel
            : resourceLanding
              ? formatResourcePrice(resourceLanding.priceTtc)
              : selectedOffer.price}
        </p>
        <p className="mt-2 text-sm text-white/85">
          {resourceOrder || resourceLanding ? 'Commande document – TVA incluse' : selectedOffer.tax}
        </p>
        {orderReference ? (
          <p className="mt-2 text-xs font-semibold text-white/80">{orderReference}</p>
        ) : null}
      </section>

      {isResourceFlow && (resourceOrder || isCartFlow) ? (
        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-sm font-extrabold">Récapitulatif</p>
          </div>
          {isCartFlow ? (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {cartOrders.map((order) => (
                <li key={order.id} className="flex justify-between gap-2">
                  <span>{order.serviceTitle}</span>
                  <span className="font-semibold text-foreground">
                    {`${Number(order.priceTtc || 0).toFixed(2).replace('.', ',')} €`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {resourceOrder.companyName ? (
                <p className="text-sm text-muted-foreground">{resourceOrder.companyName}</p>
              ) : null}
              {catalogService?.estimatedDelay ? (
                <p className="mt-1 text-xs text-muted-foreground">Délai : {catalogService.estimatedDelay}</p>
              ) : null}
              {catalogService ? (
                <p className="mt-1 text-xs text-muted-foreground">{getProcessingLabel(catalogService)}</p>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Retour Mollie sécurisé
        </div>
        Sur l’application, le paiement s’ouvre dans le navigateur sécurisé de votre téléphone.
        Après validation, vous revenez automatiquement dans Greffio pour la confirmation.
        <div className="mt-3 flex items-center gap-2 text-xs">
          <LockKeyhole className="h-4 w-4 text-primary" />
          Carte bancaire via Mollie – chiffrement TLS et confirmation serveur.
        </div>
      </section>

      {resourceLanding ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Indiquez d’abord l’entreprise concernée (SIREN, dénomination) pour finaliser cette commande.
          <Button asChild className="mt-3 h-11 w-full">
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
        />
      ) : null}

      {!currentUser ? (
        <Button asChild variant="outline" className="h-11 w-full bg-white">
          <Link to={`/signup?service=${service}`}>Créer un compte d’abord</Link>
        </Button>
      ) : null}

      {resourceOrder ? (
        <Button asChild variant="ghost" className="h-11 w-full">
          <Link to="/boutique/commandes">Mes commandes</Link>
        </Button>
      ) : null}

      <Button asChild variant="ghost" className="h-11 w-full">
        <Link to={resourceOrder || resourceLanding ? '/boutique' : '/tarifs'}>Retour</Link>
      </Button>
    </MobilePageContainer>
  );
};
