import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheckBig, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { isCapacitorNative } from '@/utils/platform.js';

export const PaymentVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const resourceOrderId = searchParams.get('resourceOrderId');
  const paymentStatus = searchParams.get('status');
  const nativeApp = isCapacitorNative();

  const stateCopy = useMemo(() => {
    if (paymentStatus === 'paid' || paymentStatus === 'authorized') {
      return {
        icon: <CircleCheckBig className="h-6 w-6" />,
        tone: 'text-emerald-700 bg-emerald-100',
        title: 'Paiement confirmé',
        description: 'Votre paiement Mollie a été accepté. Greffio finalise la confirmation côté serveur avant de mettre à jour votre espace.',
      };
    }
    if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || paymentStatus === 'expired') {
      return {
        icon: <Clock3 className="h-6 w-6" />,
        tone: 'text-amber-800 bg-amber-100',
        title: 'Paiement non finalisé',
        description: 'Le paiement n’a pas abouti ou a été annulé. Vous pouvez réessayer depuis la page de paiement ou Mes commandes.',
      };
    }
    return {
      icon: <CircleCheckBig className="h-6 w-6" />,
      tone: 'text-emerald-700 bg-emerald-100',
      title: 'Retour paiement effectué',
      description: 'Votre retour depuis Mollie a été enregistré. Greffio vérifie le statut auprès du prestataire avant confirmation.',
    };
  }, [paymentStatus]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_42%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%,#eef4ff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to={nativeApp ? '/dashboard' : '/'}>{nativeApp ? 'Accueil app' : 'Accueil'}</Link>
          </Button>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-[#cfe0f5] bg-white p-7 shadow-[0_28px_80px_rgba(30,77,140,0.12)]">
          <div className="pointer-events-none mb-4 h-1 w-full rounded-full bg-gradient-to-r from-[hsl(var(--greffio-blue))] via-[hsl(var(--greffio-citron))] to-[hsl(var(--greffio-blue))]/40" />
          <div className={`mb-4 inline-flex rounded-2xl p-3 ${stateCopy.tone}`}>
            {stateCopy.icon}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Paiement Mollie</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{stateCopy.title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {stateCopy.description}
          </p>
          {nativeApp ? (
            <p className="mt-3 rounded-xl bg-[#f8fbff] px-3 py-2 text-xs leading-5 text-muted-foreground">
              Vous êtes bien revenu dans l’application Greffio. Le statut peut prendre quelques secondes avant d’apparaître dans votre espace.
            </p>
          ) : null}
          <div className="mt-5 rounded-2xl border border-[#dbe7f7] bg-[#f8fbff] p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-[hsl(var(--greffio-blue-900))]">
              <Clock3 className="h-4 w-4 text-primary" />
              Vérification serveur
            </p>
            <p className="mt-2">
              Actualisez votre tableau de bord dans quelques secondes pour voir le nouveau statut.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Confirmation serveur
            </span>
            <span className="inline-flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-primary" />
              Chiffrement TLS · Mollie
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {resourceOrderId && (
              <Button asChild className="rounded-xl font-bold">
                <Link to="/boutique/commandes">Mes commandes</Link>
              </Button>
            )}
            <Button asChild className="rounded-xl font-bold">
              <Link to="/dashboard">Ouvrir le dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="rounded-xl bg-white font-bold">
              <Link to="/dossiers">Voir mes dossiers</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};
