import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BadgeEuro, CheckCircle2, CreditCard, FileText, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { PAYMENT_METHODS } from '@/config/businessCatalog.js';
import { createPayment } from '@/api/payments.js';
import { TotalCostSimulator } from '@/components/TotalCostSimulator.jsx';
import { getCurrentDossierId } from '@/utils/sessionStore.js';

const offers = {
  'Statuts gratuits': { title: 'Statuts gratuits', price: '0€', tax: 'Aucun paiement requis', legalFees: 'Frais légaux non inclus si dépôt ultérieur' },
  'Dossier Standard': { title: 'Dossier Standard', price: '99€ HT', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux refacturés ou payés séparément' },
  'Équipe Greffio Premium': { title: 'Équipe Greffio Premium', price: '199€ HT', tax: 'TVA calculée au paiement', legalFees: 'Frais légaux et tiers visibles avant validation' },
};

export const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const offerName = searchParams.get('offer') || 'Dossier Standard';
  const service = searchParams.get('service') || 'creation';
  const selectedOffer = offers[offerName] || offers['Dossier Standard'];
  const mainMethods = useMemo(() => PAYMENT_METHODS.filter((method) => method.id !== 'optional'), []);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const handleGoCardlessCheckout = async () => {
    try {
      setIsCreatingPayment(true);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/">
            <GreffioLogo variant="full" />
          </Link>
          <Button variant="outline" asChild className="bg-white">
            <Link to="/mentions-legales">CGV</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-md bg-[hsl(var(--greffio-blue))] p-6 text-white shadow-elevation-md md:p-8">
            <p className="text-sm font-bold uppercase text-white/70">Paiement sécurisé</p>
            <h1 className="mt-2 text-3xl font-extrabold">Paiement sécurisé via GoCardless</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/78">
              Greffio utilise GoCardless pour encaisser les paiements par prélèvement SEPA ou virement instantané,
              avec vérification serveur et webhook idempotent avant traitement du dossier.
            </p>
            <p className="mt-3 text-xs leading-6 text-white/85">
              Greffio est un service privé indépendant d’assistance aux démarches administratives des entreprises. Greffio n’est pas un service officiel de l’État, des greffes des tribunaux de commerce ou d’Infogreffe.
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
        </section>

        <aside className="space-y-5">
          <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary">
              <BadgeEuro className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold uppercase text-primary">Offre sélectionnée</p>
            <h2 className="mt-1 text-2xl font-extrabold">{selectedOffer.title}</h2>
            <p className="mt-3 text-4xl font-extrabold">{selectedOffer.price}</p>
            <div className="mt-5 space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <ReceiptText className="mt-0.5 h-4 w-4 text-primary" />
                <span>{selectedOffer.tax}</span>
              </div>
              <div className="flex gap-2">
                <FileText className="mt-0.5 h-4 w-4 text-primary" />
                <span>{selectedOffer.legalFees}</span>
              </div>
              <div className="flex gap-2">
                <LockKeyhole className="mt-0.5 h-4 w-4 text-primary" />
                <span>Paiement sécurisé via GoCardless (SEPA / virement).</span>
              </div>
            </div>
            <Button asChild className="mt-6 w-full justify-between">
              <Link to={`/signup?service=${service}`}>
                Créer le compte et payer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              type="button"
              className="mt-3 w-full justify-between"
              variant="outline"
              onClick={handleGoCardlessCheckout}
              disabled={isCreatingPayment}
            >
              {isCreatingPayment ? 'Initialisation...' : 'Payer maintenant via GoCardless'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>

          <section className="rounded-md border border-border bg-white p-5 shadow-elevation-sm">
            <p className="font-extrabold">Options à activer selon besoin</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{PAYMENT_METHODS.find((method) => method.id === 'optional').description}</p>
            <div className="mt-4 rounded-md bg-muted p-3 text-sm font-semibold text-foreground">PayPal · Klarna · Alma</div>
          </section>
        </aside>
      </main>
    </div>
  );
};
