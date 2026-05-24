import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeEuro, CheckCircle2, CreditCard, FileText, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PAYMENT_METHODS } from '@/config/businessCatalog.js';
import { createPayment } from '@/api/payments.js';
import { checkoutResourceOrder, getResourceOrder } from '@/api/resources.js';
import { getCatalogItemById } from '@/config/resourceServices.js';
import { TotalCostSimulator } from '@/components/TotalCostSimulator.jsx';
import { getCurrentDossierId } from '@/utils/sessionStore.js';

const offers = {
  'Statuts gratuits': { title: 'Statuts gratuits', price: '0€', tax: 'Aucun paiement requis', legalFees: 'Frais légaux non inclus si dépôt ultérieur' },
  'Dossier Standard': { title: 'Dossier Standard', price: '99€ HT', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux refacturés ou payés séparément' },
  'Équipe Greffio Premium': { title: 'Équipe Greffio Premium', price: '199€ HT', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux et tiers visibles avant validation' },
  'jeune-entrepreneur': { title: 'Offre Jeune Entrepreneur.e', price: '70€', compareAt: '149€', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux refacturés ou payés séparément' },
  Formalité: { title: 'Formalité', price: '149€', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux refacturés ou payés séparément' },
};

export const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const offerName = searchParams.get('offer') || 'Dossier Standard';
  const service = searchParams.get('service') || 'creation';
  const resourceOrderId = searchParams.get('resourceOrder');
  const selectedOffer = offers[offerName] || offers['Dossier Standard'];
  const mainMethods = useMemo(() => PAYMENT_METHODS.filter((method) => method.id !== 'optional'), []);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [resourceOrder, setResourceOrder] = useState(null);
  const [loadingResourceOrder, setLoadingResourceOrder] = useState(Boolean(resourceOrderId));

  const catalogService = resourceOrder?.serviceId
    ? getCatalogItemById(resourceOrder.serviceId)
    : getCatalogItemById(service);

  useEffect(() => {
    if (!resourceOrderId) {
      setLoadingResourceOrder(false);
      return;
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

  const handleGoCardlessCheckout = async () => {
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
      const payload = await createPayment({
        dossierId,
        offerCode: offerName,
      });
      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }
      throw new Error('CHECKOUT_URL_MISSING');
    } catch (error) {
      toast.error("Impossible d'initialiser le paiement GoCardless.");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const resourcePriceLabel = resourceOrder
    ? `${Number(resourceOrder.priceTtc || 0).toFixed(2).replace('.', ',')} € TTC`
    : null;

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
              {resourceOrder ? 'Paiement de votre commande document' : 'Paiement sécurisé via GoCardless'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/92">
              {resourceOrder
                ? 'Réglez votre commande de document ou service administratif. Après confirmation, l’équipe Greffio traite votre demande.'
                : 'Greffio utilise GoCardless pour encaisser les paiements par prélèvement SEPA ou virement instantané, avec vérification serveur et webhook idempotent avant traitement du dossier.'}
            </p>
          </div>

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

          {!resourceOrderId && (
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
                <p className="text-sm font-bold uppercase text-primary">Commande ressource</p>
                <h2 className="mt-1 text-2xl font-extrabold">{resourceOrder.serviceTitle}</h2>
                {loadingResourceOrder ? (
                  <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
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
                <span>{resourceOrder ? 'TVA incluse — document administratif' : selectedOffer.tax}</span>
              </div>
              {!resourceOrder && (
                <div className="flex gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{selectedOffer.legalFees}</span>
                </div>
              )}
              <div className="flex gap-2">
                <LockKeyhole className="mt-0.5 h-4 w-4 text-primary" />
                <span>Paiement sécurisé via GoCardless (SEPA / virement).</span>
              </div>
            </div>
            {!resourceOrder && (
              <Button asChild className="mt-6 w-full justify-between">
                <Link to={`/signup?service=${service}`}>
                  Créer le compte et payer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              type="button"
              className="mt-3 w-full justify-between"
              variant={resourceOrder ? 'default' : 'outline'}
              onClick={handleGoCardlessCheckout}
              disabled={isCreatingPayment || (resourceOrderId && loadingResourceOrder)}
            >
              {isCreatingPayment ? 'Initialisation...' : 'Payer via GoCardless'}
              <ArrowRight className="h-4 w-4" />
            </Button>
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
