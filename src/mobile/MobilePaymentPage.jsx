import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { PAYMENT_METHODS } from '@/config/businessCatalog.js';
import { checkoutDossierPayment } from '@/api/payments.js';
import { inferCustomerType, isB2B } from '@/utils/customerType.js';
import { checkoutResourceOrder, getResourceOrder } from '@/api/resources.js';
import { getCatalogItemById } from '@/config/resourceServices.js';
import { getCurrentDossierId } from '@/utils/sessionStore.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useDossiersQuery } from '@/hooks/queries/useDossiersQuery.js';
import { MobilePageSkeleton } from '@/mobile/ui/MobilePageSkeleton.jsx';
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
  const mainMethods = useMemo(() => PAYMENT_METHODS.filter((method) => method.id !== 'optional'), []);

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
      if (code === 'GOCARDLESS_FORBIDDEN_FOR_B2C' || code === 'B2C_REQUIRES_CAWL') {
        toast.error('Paiement B2C indisponible : configuration CAWL en attente. Contactez le support.');
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

  return (
    <div className="space-y-5 px-4 py-5 pb-28">
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
          {resourceOrder ? resourceOrder.serviceTitle : selectedOffer.title}
        </h1>
        <p className="mt-3 text-3xl font-extrabold">
          {resourceOrder ? resourcePriceLabel : selectedOffer.price}
        </p>
        <p className="mt-2 text-sm text-white/85">{resourceOrder ? 'Commande document' : selectedOffer.tax}</p>
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
          {showB2BProviders ? 'Paiement professionnel SEPA / virement.' : 'Carte ou wallet — chiffrement TLS.'}
        </div>
      </section>

      <Button
        type="button"
        className="h-12 w-full text-base"
        onClick={handleCheckout}
        disabled={isCreatingPayment || (resourceOrderId && loadingResourceOrder)}
      >
        {isCreatingPayment ? 'Redirection sécurisée…' : 'Payer maintenant'}
        <ArrowRight className="h-4 w-4" />
      </Button>

      {!currentUser ? (
        <Button asChild variant="outline" className="h-11 w-full bg-white">
          <Link to={`/signup?service=${service}`}>Créer un compte d’abord</Link>
        </Button>
      ) : null}

      <Button asChild variant="ghost" className="h-11 w-full">
        <Link to={resourceOrder ? '/ressources' : '/tarifs'}>Retour</Link>
      </Button>
    </div>
  );
};
