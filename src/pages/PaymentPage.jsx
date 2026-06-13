import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeEuro, CheckCircle2, CreditCard, FileText, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PAYMENT_METHODS } from '@/config/businessCatalog.js';
import { checkoutDossierPayment } from '@/api/payments.js';
import { inferCustomerType, isB2B } from '@/utils/customerType.js';
import { checkoutResourceOrder, getResourceOrder } from '@/api/resources.js';
import { formatResourcePrice, getCatalogItemById, getProcessingLabel } from '@/config/resourceServices.js';
import { GreffioPaymentTerminal } from '@/components/payments/GreffioPaymentTerminal.jsx';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { formatEuroCents, resolveOfferAmountCents } from '@/config/paymentOffers.js';
import { TotalCostSimulator } from '@/components/TotalCostSimulator.jsx';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { useAuth } from '@/hooks/useAuth.js';
import { listDossiers } from '@/api/dossiers.js';
import { resolvePaymentCheckoutErrorMessage } from '@/utils/paymentErrors.js';

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
  const selectedOffer = offers[offerName] || offers['Dossier Standard'];
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [resourceOrder, setResourceOrder] = useState(null);
  const [activeDossier, setActiveDossier] = useState(null);
  const [loadingResourceOrder, setLoadingResourceOrder] = useState(Boolean(resourceOrderId));
  const customerType = useMemo(
    () => inferCustomerType(currentUser, activeDossier),
    [currentUser, activeDossier],
  );
  const showB2BProviders = isB2B(customerType);
  const mainMethods = useMemo(() => {
    const methods = PAYMENT_METHODS.filter((method) => method.id !== 'optional');
    if (showB2BProviders) {
      return methods.filter((method) => ['gocardless-checkout', 'sepa-transfer', 'sepa-debit'].includes(method.id));
    }
    return methods.filter((method) => ['google-pay', 'cards'].includes(method.id));
  }, [showB2BProviders]);

  const catalogService = resourceOrder?.serviceId
    ? getCatalogItemById(resourceOrder.serviceId)
    : getCatalogItemById(service);
  // Lien direct /paiement?service=<doc> sans commande créée : afficher le bon document, pas l'offre dossier.
  const resourceLanding = !resourceOrderId
    && catalogService
    && ['document', 'pack', 'service'].includes(catalogService.kind)
    ? catalogService
    : null;
  const isResourceFlow = Boolean(resourceOrderId || resourceLanding);

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
        window.location.href = payload.checkoutUrl;
        return;
      }
      throw new Error('CHECKOUT_URL_MISSING');
    } catch (error) {
      toast.error(resolvePaymentCheckoutErrorMessage(error));
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const amountCents = resourceOrder
    ? Math.round(Number(resourceOrder.priceTtc || 0) * 100)
    : resourceLanding
      ? 0
      : resolveOfferAmountCents(offerName);
  const resourcePriceLabel = resourceOrder
    ? `${Number(resourceOrder.priceTtc || 0).toFixed(2).replace('.', ',')} € TTC`
    : null;
  const amountLabel = resourceOrder ? resourcePriceLabel : formatEuroCents(amountCents);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/mentions-legales">CGV</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
            <p className="text-sm font-bold uppercase text-white/70">Paiement sécurisé</p>
            <h1 className="mt-2 text-3xl font-extrabold">
              {isResourceFlow ? 'Réglez votre document en quelques secondes' : 'Paiement sécurisé'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
              {isResourceFlow
                ? 'Paiement express par Google Pay ou carte, avec confirmation serveur. Dès validation, l’équipe Greffio traite votre commande et dépose le document dans votre espace.'
                : 'Paiement sécurisé par Google Pay ou carte bancaire, avec vérification serveur avant validation du dossier.'}
            </p>
          </div>

          {isResourceFlow ? (
            <>
              <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <div className="mb-4 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-extrabold">Récapitulatif de votre commande</h2>
                </div>
                <dl className="divide-y divide-border text-sm">
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-muted-foreground">Document / service</dt>
                    <dd className="text-right font-semibold">
                      {resourceOrder?.serviceTitle || resourceLanding?.title}
                    </dd>
                  </div>
                  {resourceOrder?.companyName && (
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Entreprise</dt>
                      <dd className="text-right font-semibold">{resourceOrder.companyName}</dd>
                    </div>
                  )}
                  {resourceOrder?.siren && (
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">SIREN / SIRET</dt>
                      <dd className="text-right font-semibold">{resourceOrder.siren}</dd>
                    </div>
                  )}
                  {catalogService?.estimatedDelay && (
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Délai estimatif</dt>
                      <dd className="text-right font-semibold">{catalogService.estimatedDelay}</dd>
                    </div>
                  )}
                  {catalogService && (
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Traitement</dt>
                      <dd className="text-right font-semibold">{getProcessingLabel(catalogService)}</dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                {[
                  { title: '1. Paiement express', text: 'Google Pay ou carte bancaire – montant TTC, sans frais cachés.' },
                  { title: '2. Traitement Greffio', text: 'Notre équipe lance la demande auprès du greffe ou de l’organisme concerné.' },
                  { title: '3. Document dans votre espace', text: 'Vous le retrouvez dans « Documents », avec une notification par email.' },
                ].map((step) => (
                  <div key={step.title} className="rounded-md border border-border bg-white p-4 shadow-elevation-sm">
                    <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
                    <p className="text-sm font-extrabold">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
                  </div>
                ))}
              </section>

              {currentUser && amountCents > 0 ? (
                <GreffioPaymentTerminal
                  amountCents={amountCents}
                  amountLabel={amountLabel}
                  offerLabel={resourceOrder?.serviceTitle || resourceLanding?.title || selectedOffer.title}
                  dossierId={!resourceOrderId ? getCurrentDossierId() : undefined}
                  resourceOrderId={resourceOrderId || undefined}
                  offerCode={offerName}
                  onPayByCard={handleCheckout}
                  isCreatingPayment={isCreatingPayment}
                  cardButtonLabel="Payer par carte bancaire"
                />
              ) : null}
            </>
          ) : (
            <section className="grid gap-4 md:grid-cols-2">
              {mainMethods.map((method) => (
                <div key={method.id} className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <CreditCard className="h-6 w-6 text-primary" />
                    {method.recommended && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Recommandé</span>}
                  </div>
                  <p className="text-sm font-bold uppercase text-primary">{method.type}</p>
                  <h2 className="mt-1 text-lg font-extrabold">{method.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{method.description}</p>
                </div>
              ))}
            </section>
          )}

          {!isResourceFlow && (
            <>
              <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
                <div className="mb-4 flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-extrabold">Règle de paiement retenue</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    'Paiement immédiat par carte ou wallet pour les offres standard.',
                    'Virement SEPA pour comptes pros, cabinets et montants élevés.',
                    'Prélèvement SEPA pour abonnements et offres récurrentes.',
                  ].map((item) => (
                    <div key={item} className="rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>
              <TotalCostSimulator />
            </>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
              <BadgeEuro className="h-5 w-5" />
            </div>
            {resourceOrder ? (
              <>
                <p className="text-sm font-bold uppercase text-primary">Commande document</p>
                <h2 className="mt-1 text-2xl font-extrabold">{resourceOrder.serviceTitle}</h2>
                {loadingResourceOrder ? (
                  <PageLoadingState
                    compact
                    className="mt-3"
                    label="Chargement de la commande…"
                    description="Préparation du terminal de paiement."
                  />
                ) : (
                  <>
                    <p className="mt-3 text-4xl font-extrabold">{resourcePriceLabel}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Réf. {resourceOrder.id}</p>
                    {resourceOrder.companyName && (
                      <p className="mt-1 text-sm text-muted-foreground">{resourceOrder.companyName}</p>
                    )}
                  </>
                )}
              </>
            ) : resourceLanding ? (
              <>
                <p className="text-sm font-bold uppercase text-primary">Document sélectionné</p>
                <h2 className="mt-1 text-2xl font-extrabold">{resourceLanding.title}</h2>
                <p className="mt-3 text-4xl font-extrabold">{formatResourcePrice(resourceLanding.priceTtc)}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold uppercase text-primary">Offre sélectionnée</p>
                <h2 className="mt-1 text-2xl font-extrabold">{selectedOffer.title}</h2>
                <p className="mt-3 text-4xl font-extrabold">{selectedOffer.price}</p>
              </>
            )}
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <ReceiptText className="mt-0.5 h-4 w-4 text-primary" />
                <span>{isResourceFlow ? 'TVA incluse – document administratif' : selectedOffer.tax}</span>
              </div>
              {!isResourceFlow && (
                <div className="flex gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{selectedOffer.legalFees}</span>
                </div>
              )}
              <div className="flex gap-2">
                <LockKeyhole className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  {isResourceFlow || !showB2BProviders
                    ? 'Paiement Google Pay / carte – chiffrement TLS et confirmation serveur.'
                    : 'Paiement sécurisé professionnel (SEPA / virement).'}
                </span>
              </div>
            </div>
            {resourceLanding && (
              <>
                <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  Indiquez d’abord l’entreprise concernée (SIREN, dénomination) pour finaliser cette commande.
                </p>
                <Button asChild className="mt-3 w-full justify-between">
                  <Link to={currentUser ? '/boutique' : '/ressources'}>
                    Compléter ma commande
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
            {!isResourceFlow && (
              <Button asChild className="mt-6 w-full justify-between">
                <Link to={`/signup?service=${service}`}>
                  Créer le compte et payer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {!isResourceFlow && currentUser && !showB2BProviders && amountCents > 0 ? (
              <GreffioPaymentTerminal
                className="mt-5"
                amountCents={amountCents}
                amountLabel={amountLabel}
                offerLabel={selectedOffer.title}
                dossierId={getCurrentDossierId()}
                offerCode={offerName}
                onPayByCard={handleCheckout}
                isCreatingPayment={isCreatingPayment}
                cardButtonLabel="Payer maintenant"
              />
            ) : null}
            {(showB2BProviders || (resourceOrder && !currentUser)) && !resourceLanding ? (
            <Button
              type="button"
              className="mt-3 w-full justify-between"
              variant={resourceOrder ? 'default' : showB2BProviders ? 'default' : 'outline'}
              onClick={handleCheckout}
              disabled={isCreatingPayment || (resourceOrderId && loadingResourceOrder)}
            >
              {isCreatingPayment
                ? 'Initialisation...'
                : resourceOrder
                  ? 'Payer par carte bancaire'
                  : 'Payer maintenant'}
              <ArrowRight className="h-4 w-4" />
            </Button>
            ) : null}
            {resourceOrder && (
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link to="/ressources">Retour aux ressources</Link>
              </Button>
            )}
          </section>

          {catalogService?.description && resourceOrder && (
            <section className="rounded-md border border-border bg-muted/50 p-5 text-sm leading-6 text-muted-foreground">
              {catalogService.description}
            </section>
          )}
        </aside>
      </main>
    </div>
  );
};
