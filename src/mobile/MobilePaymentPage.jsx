import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { PAYMENT_METHODS } from '@/config/businessCatalog.js';
import { checkoutDossierPayment } from '@/api/payments.js';
import { inferCustomerType, isB2B } from '@/utils/customerType.js';
import { checkoutResourceOrder, getResourceOrder } from '@/api/resources.js';
import { formatResourcePrice, getCatalogItemById } from '@/config/resourceServices.js';
import { GreffioPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
import { formatEuroCents, resolveOfferAmountCents } from '@/config/paymentOffers.js';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
import { MobilePageContainer } from '@/mobile/ui/MobilePageContainer.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { OfflineDataBanner } from '@/components/system/OfflineDataBanner.jsx';

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
  const pspStatus = searchParams.get('status');
  const selectedOffer = offers[offerName] || offers['Dossier Standard'];
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [resourceOrder, setResourceOrder] = useState(null);
  const [loadingResourceOrder, setLoadingResourceOrder] = useState(Boolean(resourceOrderId));
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
  const showB2BProviders = isB2B(customerType);
  // Lien direct /paiement?service=<doc> sans commande créée : afficher le bon document, pas l'offre dossier.
  const landingCatalogItem = !resourceOrderId ? getCatalogItemById(service) : null;
  const resourceLanding = landingCatalogItem && ['document', 'pack', 'service'].includes(landingCatalogItem.kind)
    ? landingCatalogItem
    : null;
  const mainMethods = useMemo(() => {
    const methods = PAYMENT_METHODS.filter((method) => method.id !== 'optional');
    if (showB2BProviders) {
      return methods.filter((method) => ['gocardless-checkout', 'sepa-transfer', 'sepa-debit'].includes(method.id));
    }
    return methods.filter((method) => ['google-pay', 'cards'].includes(method.id));
  }, [showB2BProviders]);

  useEffect(() => {
    if (!resourceOrderId) {
      setLoadingResourceOrder(false);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
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
  }, [resourceOrderId]);

  const handleCheckout = async () => {
    try {
      setIsCreatingPayment(true);
      if (resourceOrderId) {
        const payload = await checkoutResourceOrder(resourceOrderId);
        if (payload.checkoutUrl) {
          window.location.href = payload.checkoutUrl;
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
      });
      if (payload.checkoutUrl) {
        window.sessionStorage.setItem('greffio_payment_return', window.location.pathname + window.location.search);
        window.location.href = payload.checkoutUrl;
        return;
      }
      throw new Error('CHECKOUT_URL_MISSING');
    } catch (error) {
      const code = error?.payload?.error || error?.message;
      if ([
        'GOCARDLESS_FORBIDDEN_FOR_B2C',
        'B2C_REQUIRES_CAWL',
        'PAYMENT_PROVIDER_NOT_CONFIGURED',
        'CAWL_NOT_CONFIGURED',
      ].includes(code)) {
        toast.error('Paiement carte indisponible : le prestataire serveur n’est pas encore configuré.');
      } else if (code === 'API_TRANSIENT_UNAVAILABLE' || error?.status === 503) {
        toast.error('Paiement momentanément indisponible. Réessayez dans quelques instants.');
      } else {
        toast.error('Impossible d’initialiser le paiement sécurisé.');
      }
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (dossiersLoading && !resourceOrderId) return <MobilePageSkeleton />;

  const resourcePriceLabel = resourceOrder
    ? `${Number(resourceOrder.priceTtc || 0).toFixed(2).replace('.', ',')} € TTC`
    : null;
  const amountCents = resourceOrder
    ? Math.round(Number(resourceOrder.priceTtc || 0) * 100)
    : resourceLanding
      ? 0
      : resolveOfferAmountCents(offerName);
  const amountLabel = resourceOrder ? resourcePriceLabel : formatEuroCents(amountCents);

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
          {resourceOrder ? resourceOrder.serviceTitle : resourceLanding ? resourceLanding.title : selectedOffer.title}
        </h1>
        <p className="mt-3 text-3xl font-extrabold">
          {resourceOrder
            ? resourcePriceLabel
            : resourceLanding
              ? formatResourcePrice(resourceLanding.priceTtc)
              : selectedOffer.price}
        </p>
        <p className="mt-2 text-sm text-white/85">
          {resourceOrder || resourceLanding ? 'Commande document — TVA incluse' : selectedOffer.tax}
        </p>
      </section>

      <section className="space-y-3">
        {mainMethods.slice(0, 2).map((method) => (
          <div key={method.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-primary">{method.type}</p>
            <p className="mt-1 text-base font-extrabold">{method.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">{method.description}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Retour PSP sécurisé
        </div>
        Après validation chez le prestataire de paiement, vous revenez automatiquement sur Greffio.
        Le statut est vérifié côté serveur avant confirmation du dossier.
        <div className="mt-3 flex items-center gap-2 text-xs">
          <LockKeyhole className="h-4 w-4 text-primary" />
          {showB2BProviders ? 'Paiement professionnel SEPA / virement.' : 'Google Pay / carte bancaire — chiffrement TLS.'}
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

      {currentUser && (resourceOrder || !showB2BProviders) && amountCents > 0 && !loadingResourceOrder ? (
        <GreffioPaymentTerminal
          amountCents={amountCents}
          amountLabel={amountLabel}
          offerLabel={resourceOrder?.serviceTitle || selectedOffer.title}
          dossierId={!resourceOrderId ? getCurrentDossierId() : undefined}
          resourceOrderId={resourceOrderId || undefined}
          offerCode={offerName}
          onPayByCard={handleCheckout}
          isCreatingPayment={isCreatingPayment}
          cardButtonLabel={resourceOrder ? 'Payer par carte bancaire' : 'Payer maintenant'}
        />
      ) : null}

      {(showB2BProviders || (resourceOrder && !currentUser)) && !resourceLanding ? (
      <Button
        type="button"
        variant="default"
        className="h-12 w-full text-base"
        onClick={handleCheckout}
        disabled={isCreatingPayment || (resourceOrderId && loadingResourceOrder)}
      >
        {isCreatingPayment
          ? 'Redirection sécurisée…'
          : resourceOrder
            ? 'Payer par carte bancaire'
            : 'Payer maintenant'}
        <ArrowRight className="h-4 w-4" />
      </Button>
      ) : null}

      {!currentUser ? (
        <Button asChild variant="outline" className="h-11 w-full bg-white">
          <Link to={`/signup?service=${service}`}>Créer un compte d’abord</Link>
        </Button>
      ) : null}

      <Button asChild variant="ghost" className="h-11 w-full">
        <Link to={resourceOrder || resourceLanding ? '/ressources' : '/tarifs'}>Retour</Link>
      </Button>
    </MobilePageContainer>
  );
};
