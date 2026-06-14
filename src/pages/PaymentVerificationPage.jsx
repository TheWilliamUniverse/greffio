import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheckBig, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';

export const PaymentVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const dossierId = searchParams.get('dossierId');
  const resourceOrderId = searchParams.get('resourceOrderId');
  const paymentId = searchParams.get('paymentId');
  const provider = searchParams.get('provider') || searchParams.get('status') || 'mollie';
  const providerLabel = provider === 'mollie' || provider === 'paid' || provider === 'open'
    ? 'Mollie'
    : 'carte bancaire';

  const stateCopy = useMemo(() => ({
    icon: <CircleCheckBig className="h-6 w-6" />,
    tone: 'text-emerald-700 bg-emerald-100',
    title: 'Retour paiement effectué',
    description: `Votre retour ${providerLabel} a été enregistré. Greffio attend la confirmation serveur avant de lancer la suite.`,
  }), [providerLabel]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_42%),linear-gradient(180deg,#f8fbff_0%,#ffffff_55%,#eef4ff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
          <GreffioLogo variant="full" to="/" />
          <Button variant="outline" asChild className="bg-white">
            <Link to="/">Accueil</Link>
          </Button>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-[#cfe0f5] bg-white p-7 shadow-[0_28px_80px_rgba(30,77,140,0.12)]">
          <div className="pointer-events-none mb-4 h-1 w-full rounded-full bg-gradient-to-r from-[hsl(var(--greffio-blue))] via-[hsl(var(--greffio-citron))] to-[hsl(var(--greffio-blue))]/40" />
          <div className={`mb-4 inline-flex rounded-2xl p-3 ${stateCopy.tone}`}>
            {stateCopy.icon}
          </div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Terminal Greffio</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[hsl(var(--greffio-blue-900))]">{stateCopy.title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {stateCopy.description}
          </p>
          {paymentId && (
            <p className="mt-3 rounded-xl bg-[#f8fbff] px-3 py-2 text-xs font-mono text-muted-foreground">
              Paiement: {paymentId}
            </p>
          )}
          {resourceOrderId && (
            <p className="mt-3 rounded-xl bg-[#f8fbff] px-3 py-2 text-xs font-mono text-muted-foreground">
              Commande document: {resourceOrderId}
            </p>
          )}
          {dossierId && !resourceOrderId && (
            <p className="mt-3 rounded-xl bg-[#f8fbff] px-3 py-2 text-xs font-mono text-muted-foreground">
              Dossier: {dossierId}
            </p>
          )}
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
              Chiffrement TLS
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {resourceOrderId && (
              <Button asChild className="rounded-xl font-bold">
                <Link to="/ressources">Retour aux ressources</Link>
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
