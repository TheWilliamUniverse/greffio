import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, LockKeyhole, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { checkoutDossierPayment } from '@/api/payments.js';
import { inferCustomerType } from '@/utils/customerType.js';
import { checkoutResourceOrder, checkoutCartPayment, getResourceOrder } from '@/api/resources.js';
import { formatResourcePrice, getCatalogItemById, getProcessingLabel } from '@/config/resourceServices.js';
import { CheckoutOrderSummary } from '@/components/payments/CheckoutOrderSummary.jsx';
import { GreffioPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { formatEuroCents, resolveOfferAmountCents } from '@/config/paymentOffers.js';
import { TotalCostSimulator } from '@/components/TotalCostSimulator.jsx';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { useAuth } from '@/hooks/useAuth.js';
import { listDossiers } from '@/api/dossiers.js';
import { resolvePaymentCheckoutErrorMessage } from '@/utils/paymentErrors.js';
import { formatOrderPublicReference } from '@/utils/orderReference.js';
import { openPaymentCheckoutUrl } from '@/utils/paymentCheckoutNavigation.js';

const offers = {
  'Statuts gratuits': { title: 'Statuts gratuits', price: '0€', tax: 'Aucun paiement requis', legalFees: 'Frais légaux non inclus si dépôt ultérieur' },
  'Dossier gratuit': { title: 'Statuts gratuits', price: '0€', tax: 'Aucun paiement requis', legalFees: 'Frais légaux non inclus si dépôt ultérieur' },
  'Dossier Standard': { title: 'Dossier Standard', price: '99€ HT', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux refacturés ou payés séparément' },
  'Équipe Greffio Premium': { title: 'Équipe Greffio Premium', price: '199€ HT', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux et tiers visibles avant validation' },
  'jeune-entrepreneur': { title: 'Offre Jeune Entrepreneur.e', price: '70€', compareAt: '149€', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux refacturés ou payés séparément' },
  Formalité: { title: 'Formalité', price: '149€', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux refacturés ou payés séparément' },
};

export const PaymentPage = () => {
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
  const selectedOffer = offers[offerName] || offers['Dossier Standard'];
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [resourceOrder, setResourceOrder] = useState(null);
  const [cartOrders, setCartOrders] = useState([]);
  const [activeDossier, setActiveDossier] = useState(null);
  const [loadingResourceOrder, setLoadingResourceOrder] = useState(Boolean(resourceOrderId || cartOrderIds.length));
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

  useEffect(() => {
    const dossierId = getCurrentDossierId();
    if (!dossierId) {
      setActiveDossier(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const payload = await listDossiers();
        const match = (payload?.dossiers || []).find((item) => item.id === dossierId) || null;
        if (!cancelled) setActiveDossier(match);
      } catch (_error) {
        if (!cancelled) setActiveDossier(null);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

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

  const amountCents = isCartFlow
    ? cartOrders.reduce((sum, order) => sum + Math.round(Number(order.priceTtc || 0) * 100), 0)
    : resourceOrder
      ? Math.round(Number(resourceOrder.priceTtc || 0) * 100)
      : resourceLanding
        ? 0
        : resolveOfferAmountCents(offerName);
  const resourcePriceLabel = isCartFlow
    ? `${(amountCents / 100).toFixed(2).replace('.', ',')} € TTC`
    : resourceOrder
      ? `${Number(resourceOrder.priceTtc || 0).toFixed(2).replace('.', ',')} € TTC`
      : null;
  const amountLabel = isCartFlow || resourceOrder ? resourcePriceLabel : formatEuroCents(amountCents);
  const terminalOfferLabel = isCartFlow
    ? `Panier boutique (${cartOrders.length} article${cartOrders.length > 1 ? 's' : ''})`
    : resourceOrder?.serviceTitle || resourceLanding?.title || selectedOffer.title;

  const summaryLineItems = isCartFlow
    ? cartOrders.map((order) => ({
        id: order.id,
        label: order.serviceTitle,
        amount: `${Number(order.priceTtc || 0).toFixed(2).replace('.', ',')} €`,
      }))
    : resourceOrder
      ? [{
          id: resourceOrder.id,
          label: resourceOrder.serviceTitle,
          amount: resourcePriceLabel,
        }]
      : resourceLanding
        ? [{
            id: resourceLanding.id,
            label: resourceLanding.title,
            amount: formatResourcePrice(resourceLanding.priceTtc),
          }]
        : [{
            id: offerName,
            label: selectedOffer.title,
            amount: selectedOffer.price,
          }];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/mentions-legales#cgv">CGV</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:px-8">
        <section className="space-y-6">
          <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
            <p className="text-sm font-bold uppercase text-white/70">Paiement sécurisé</p>
            <h1 className="mt-2 text-3xl font-extrabold">
              {isResourceFlow ? 'Finalisez votre commande' : 'Paiement sécurisé'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
              {isResourceFlow
                ? 'Règlement par carte via Mollie. Dès validation, l’équipe Greffio traite votre commande et dépose le document dans votre espace.'
                : 'Règlement par carte via Mollie pour activer votre dossier Greffio.'}
            </p>
          </div>

          {isResourceFlow ? (
            <section className="grid gap-3 md:grid-cols-3">
              {[
                { title: '1. Paiement', text: 'Carte bancaire via Mollie – montant TTC affiché.' },
                { title: '2. Traitement', text: 'L’équipe Greffio lance la demande auprès de l’organisme concerné.' },
                { title: '3. Livraison', text: 'Document disponible dans votre espace, avec notification par email.' },
              ].map((step) => (
                <div key={step.title} className="rounded-md border border-border bg-white p-4 shadow-elevation-sm">
                  <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-extrabold">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </section>
          ) : (
            <TotalCostSimulator />
          )}

          {currentUser && amountCents > 0 ? (
            <GreffioPaymentTerminal
              variant="panel"
              amountCents={amountCents}
              amountLabel={amountLabel}
              offerLabel={isResourceFlow ? terminalOfferLabel : selectedOffer.title}
              onPay={handleCheckout}
              isCreatingPayment={isCreatingPayment}
              payButtonLabel="Payer en ligne"
            />
          ) : null}
        </section>

        <CheckoutOrderSummary
          lineItems={summaryLineItems}
          totalAmount={isCartFlow || resourceOrder ? resourcePriceLabel : (resourceLanding ? formatResourcePrice(resourceLanding.priceTtc) : selectedOffer.price)}
        >
          {orderReference ? (
            <p className="text-xs font-semibold text-primary">Réf. {orderReference}</p>
          ) : null}
          {resourceOrder?.companyName ? (
            <p className="text-sm text-muted-foreground">{resourceOrder.companyName}</p>
          ) : null}
          {resourceOrder?.siren ? (
            <p className="text-sm text-muted-foreground">SIREN / SIRET : {resourceOrder.siren}</p>
          ) : null}
          {catalogService?.estimatedDelay ? (
            <p className="text-sm text-muted-foreground">Délai estimatif : {catalogService.estimatedDelay}</p>
          ) : null}
          {catalogService ? (
            <p className="text-sm text-muted-foreground">{getProcessingLabel(catalogService)}</p>
          ) : null}
          <div className="space-y-3 border-t border-border pt-4 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{isResourceFlow ? 'TVA incluse – document administratif' : selectedOffer.tax}</span>
            </div>
            {!isResourceFlow ? (
              <div className="flex gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{selectedOffer.legalFees}</span>
              </div>
            ) : null}
            <div className="flex gap-2">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Paiement carte via Mollie – chiffrement TLS.</span>
            </div>
          </div>
          {loadingResourceOrder ? (
            <PageLoadingState
              compact
              className="mt-2"
              label="Chargement…"
              description="Préparation du paiement."
            />
          ) : null}
          {resourceLanding ? (
            <>
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                Indiquez d’abord l’entreprise concernée (SIREN, dénomination) pour finaliser cette commande.
              </p>
              <Button asChild className="w-full justify-between">
                <Link to={currentUser ? '/boutique' : '/ressources'}>
                  Compléter ma commande
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          ) : null}
          {!isResourceFlow && !currentUser ? (
            <Button asChild className="w-full justify-between">
              <Link to={`/signup?service=${service}`}>
                Créer le compte et payer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {resourceOrder ? (
            <Button asChild variant="outline" className="w-full bg-white">
              <Link to={currentUser ? '/boutique/commandes' : '/ressources'}>
                {currentUser ? 'Mes commandes' : 'Retour aux ressources'}
              </Link>
            </Button>
          ) : null}
          {catalogService?.description && resourceOrder ? (
            <p className="text-sm leading-6 text-muted-foreground">{catalogService.description}</p>
          ) : null}
        </CheckoutOrderSummary>
      </main>
    </div>
  );
};
