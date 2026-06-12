import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CircleCheckBig, Clock3, Loader2 } from 'lucide-react';
import { completeAmazonPaySession } from '@/api/payments.js';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';

export const PaymentVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [verification, setVerification] = useState({ status: 'idle', error: '' });
  const dossierId = searchParams.get('dossierId');
  const resourceOrderId = searchParams.get('resourceOrderId');
  const paymentId = searchParams.get('paymentId');
  const amazonCheckoutSessionId = searchParams.get('amazonCheckoutSessionId');
  const provider = searchParams.get('provider')
    || (location.pathname.includes('amazon-pay') ? 'Amazon Pay' : 'paiement');
  const isAmazonPayReturn = location.pathname.includes('amazon-pay');

  useEffect(() => {
    if (!isAmazonPayReturn) return;
    if (!paymentId || !amazonCheckoutSessionId) {
      setVerification({
        status: 'error',
        error: 'Le retour Amazon Pay ne contient pas tous les identifiants nécessaires.',
      });
      return;
    }
    let cancelled = false;
    const complete = async () => {
      setVerification({ status: 'loading', error: '' });
      try {
        const result = await completeAmazonPaySession({ paymentId, amazonCheckoutSessionId });
        if (!cancelled) {
          setVerification({
            status: result?.status === 'processing' ? 'processing' : 'success',
            error: '',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setVerification({
            status: 'error',
            error: error?.payload?.error || error?.message || 'La confirmation Amazon Pay a échoué.',
          });
        }
      }
    };
    void complete();
    return () => {
      cancelled = true;
    };
  }, [amazonCheckoutSessionId, isAmazonPayReturn, paymentId]);

  const stateCopy = useMemo(() => {
    if (verification.status === 'loading') {
      return {
        icon: <Loader2 className="h-6 w-6 animate-spin" />,
        tone: 'text-primary bg-secondary',
        title: 'Validation Amazon Pay en cours',
        description: 'Greffio finalise la session Amazon Pay et confirme le paiement auprès du serveur.',
      };
    }
    if (verification.status === 'success') {
      return {
        icon: <CircleCheckBig className="h-6 w-6" />,
        tone: 'text-emerald-700 bg-emerald-100',
        title: 'Paiement confirmé',
        description: 'Amazon Pay a confirmé le règlement. Greffio lance maintenant le traitement de votre commande.',
      };
    }
    if (verification.status === 'processing') {
      return {
        icon: <Clock3 className="h-6 w-6" />,
        tone: 'text-amber-700 bg-amber-100',
        title: 'Autorisation en cours',
        description: 'Amazon Pay traite encore l’autorisation. Le statut sera mis à jour automatiquement dès confirmation.',
      };
    }
    if (verification.status === 'error') {
      return {
        icon: <AlertTriangle className="h-6 w-6" />,
        tone: 'text-amber-800 bg-amber-100',
        title: 'Vérification à reprendre',
        description: verification.error || 'La confirmation serveur n’a pas pu être terminée.',
      };
    }
    return {
      icon: <CircleCheckBig className="h-6 w-6" />,
      tone: 'text-emerald-700 bg-emerald-100',
      title: 'Retour paiement effectué',
      description: `Votre retour ${provider} a été enregistré. Greffio attend la confirmation serveur avant de lancer la suite.`,
    };
  }, [provider, verification.error, verification.status]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/">Accueil</Link>
          </Button>
        </div>

        <section className="rounded-md border border-border bg-white p-7 shadow-elevation-md">
          <div className={`mb-4 inline-flex rounded-full p-3 ${stateCopy.tone}`}>
            {stateCopy.icon}
          </div>
          <h1 className="text-2xl font-extrabold">{stateCopy.title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {stateCopy.description}
          </p>
          {paymentId && (
            <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
              Paiement: {paymentId}
            </p>
          )}
          {resourceOrderId && (
            <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
              Commande document: {resourceOrderId}
            </p>
          )}
          {dossierId && !resourceOrderId && (
            <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
              Dossier: {dossierId}
            </p>
          )}
          <div className="mt-5 rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              {verification.status === 'success' ? 'Commande prise en charge' : 'Vérification serveur'}
            </p>
            <p className="mt-2">
              {verification.status === 'error'
                ? 'Vous pouvez revenir au paiement et choisir Amazon Pay, Google Pay ou carte bancaire.'
                : 'Actualisez votre tableau de bord dans quelques secondes pour voir le nouveau statut.'}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {resourceOrderId && (
              <Button asChild>
                <Link to="/ressources">Retour aux ressources</Link>
              </Button>
            )}
            <Button asChild>
              <Link to="/dashboard">Ouvrir le dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="bg-white">
              <Link to="/dossiers">Voir mes dossiers</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};
