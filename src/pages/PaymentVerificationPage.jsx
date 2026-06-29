import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheckBig, Clock3, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { GreffioLogo } from '@/components/GreffioLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { fetchPaymentVerificationStatus } from '@/api/payments.js';
import { formatPaymentStatusLabel } from '@/utils/orderReference.js';
import { isCapacitorNative } from '@/utils/platform.js';
import { isPageVisible } from '@/utils/pageVisibility.js';
import { clearExternalCheckoutFlag } from '@/utils/paymentCheckoutNavigation.js';

const PAID_STATUSES = new Set(['paid', 'authorized', 'PAID', 'AUTHORIZED']);
const FAILED_STATUSES = new Set(['failed', 'cancelled', 'expired', 'FAILED', 'CANCELLED', 'EXPIRED']);
const REFUND_STATUSES = new Set(['refunded', 'partially_refunded']);
const PAYMENT_POLL_BACKOFF_MS = [2000, 3000, 5000, 8000, 12000];

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

export const PaymentVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const resourceOrderId = searchParams.get('resourceOrderId');
  const dossierId = searchParams.get('dossierId');
  const molliePaymentId = searchParams.get('molliePaymentId');
  const initialStatus = searchParams.get('status');
  const nativeApp = isCapacitorNative();

  const [polling, setPolling] = useState(true);
  const [resolvedStatus, setResolvedStatus] = useState(initialStatus || '');
  const [refundPending, setRefundPending] = useState(false);
  const [pollError, setPollError] = useState('');

  useEffect(() => {
    clearExternalCheckoutFlag();
  }, []);

  useEffect(() => {
    if (!molliePaymentId && !dossierId) {
      setPolling(false);
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    let timerId = null;
    let backoffIndex = 0;
    const maxAttempts = 15;

    const finishPolling = () => {
      if (!cancelled) setPolling(false);
      if (timerId) window.clearTimeout(timerId);
    };

    const schedule = (delay) => {
      timerId = window.setTimeout(() => { void tick(); }, delay);
    };

    const tick = async () => {
      if (cancelled) return;
      if (!isPageVisible()) {
        schedule(PAYMENT_POLL_BACKOFF_MS[0]);
        return;
      }

      attempts += 1;
      try {
        const payload = await fetchPaymentVerificationStatus({
          molliePaymentId,
          dossierId,
        });
        if (cancelled) return;
        const nextStatus = payload?.status || payload?.dossierStatus || initialStatus || '';
        if (nextStatus) setResolvedStatus(nextStatus);
        setRefundPending(Boolean(payload?.refundPending));
        const normalized = normalizeStatus(nextStatus);
        if (
          PAID_STATUSES.has(nextStatus)
          || PAID_STATUSES.has(normalized)
          || FAILED_STATUSES.has(normalized)
          || REFUND_STATUSES.has(normalized)
          || payload?.refundPending
        ) {
          finishPolling();
          return;
        }
        if (payload?.resolved && nextStatus) {
          finishPolling();
          return;
        }
      } catch (_error) {
        if (!cancelled && attempts >= maxAttempts) {
          setPollError('La vérification prend plus de temps que prévu. Actualisez votre dashboard dans quelques instants.');
          finishPolling();
          return;
        }
      }
      if (attempts >= maxAttempts) {
        finishPolling();
        return;
      }
      const delay = PAYMENT_POLL_BACKOFF_MS[Math.min(backoffIndex, PAYMENT_POLL_BACKOFF_MS.length - 1)];
      backoffIndex = Math.min(backoffIndex + 1, PAYMENT_POLL_BACKOFF_MS.length - 1);
      schedule(delay);
    };

    void tick();

    const onVisible = () => {
      if (isPageVisible() && !cancelled) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dossierId, initialStatus, molliePaymentId]);

  const paymentStatus = normalizeStatus(resolvedStatus || initialStatus);

  const stateCopy = useMemo(() => {
    if (polling && !paymentStatus) {
      return {
        icon: <Loader2 className="h-6 w-6 animate-spin" />,
        tone: 'text-primary bg-primary/10',
        title: 'Vérification du paiement en cours…',
        description: 'Greffio confirme le statut auprès de Mollie et met à jour votre dossier. Cela prend généralement quelques secondes.',
      };
    }
    if (PAID_STATUSES.has(paymentStatus) || PAID_STATUSES.has(resolvedStatus)) {
      return {
        icon: <CircleCheckBig className="h-6 w-6" />,
        tone: 'text-emerald-700 bg-emerald-100',
        title: 'Paiement confirmé',
        description: 'Votre paiement Mollie a été accepté. Votre espace Greffio va refléter le nouveau statut.',
      };
    }
    if (refundPending) {
      return {
        icon: <Clock3 className="h-6 w-6" />,
        tone: 'text-amber-800 bg-amber-100',
        title: formatPaymentStatusLabel(null, { refundPending: true }),
        description: 'Votre remboursement est en cours de traitement auprès de Mollie. Le statut sera mis à jour sous peu.',
      };
    }
    if (REFUND_STATUSES.has(paymentStatus)) {
      return {
        icon: <CircleCheckBig className="h-6 w-6" />,
        tone: paymentStatus === 'partially_refunded' ? 'text-orange-800 bg-orange-100' : 'text-slate-700 bg-slate-100',
        title: formatPaymentStatusLabel(paymentStatus),
        description: paymentStatus === 'partially_refunded'
          ? 'Une partie du montant a été remboursée sur votre moyen de paiement.'
          : 'Le montant a été remboursé sur votre moyen de paiement.',
      };
    }
    if (FAILED_STATUSES.has(paymentStatus)) {
      return {
        icon: <Clock3 className="h-6 w-6" />,
        tone: 'text-amber-800 bg-amber-100',
        title: 'Paiement non finalisé',
        description: 'Le paiement n’a pas abouti ou a été annulé. Vous pouvez réessayer depuis la page de paiement ou Mes commandes.',
      };
    }
    return {
      icon: polling ? <Loader2 className="h-6 w-6 animate-spin" /> : <CircleCheckBig className="h-6 w-6" />,
      tone: polling ? 'text-primary bg-primary/10' : 'text-emerald-700 bg-emerald-100',
      title: polling ? 'Vérification du paiement en cours…' : 'Retour paiement effectué',
      description: polling
        ? 'Nous confirmons le statut auprès de Mollie avant de mettre à jour votre dossier.'
        : 'Votre retour depuis Mollie a été enregistré. Le statut peut encore être en cours de synchronisation.',
    };
  }, [paymentStatus, polling, refundPending, resolvedStatus]);

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
              {polling ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Clock3 className="h-4 w-4 text-primary" />}
              Vérification serveur
            </p>
            <p className="mt-2">
              {polling
                ? 'Interrogation du statut en cours…'
                : 'La vérification est terminée. Actualisez votre tableau de bord si le statut n’est pas encore visible.'}
            </p>
            {pollError ? <p className="mt-2 text-amber-800">{pollError}</p> : null}
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
            {dossierId ? (
              <Button asChild className="rounded-xl font-bold">
                <Link to={`/dossier/${dossierId}`}>Voir le dossier</Link>
              </Button>
            ) : null}
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
