import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, CreditCard, FileText, Link2, Plug, RefreshCw, Unplug, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '@/context/AuthContext.jsx';
import {
  getMollieConnectAuthorize,
  getMollieConnectStatus,
  getMolliePaymentStatus,
} from '@/api/ops.js';
import { PageLoadingState } from '@/components/patterns/PageLoadingState.jsx';
import { Button } from '@/components/ui/button.jsx';

const OPS_INTEGRATION_ROLES = new Set(['ADMIN', 'OPS']);

const CALLBACK_MESSAGES = {
  success: 'Compte Mollie connecté avec succès.',
  error: 'Connexion Mollie refusée ou interrompue.',
  missing_code: 'Retour OAuth incomplet (code manquant).',
  missing_state: 'Retour OAuth incomplet (state manquant).',
  not_configured: 'Mollie Connect n’est pas configuré sur l’API.',
  invalid_state: 'Session OAuth expirée ou state invalide.',
  token_failed: 'Échec de l’échange du code OAuth.',
};

const CALLBACK_CHECKLIST = [
  'MOLLIE_CALLBACK_URL enregistrée dans le dashboard Mollie (app Greffio)',
  'MOLLIE_WEBHOOK_URL pointe vers l’API VPS (/api/webhooks/mollie)',
  'MOLLIE_CONNECT_REDIRECT_URI correspond à l’app Connect for Partners',
  'Retour OAuth testé depuis cette page (Connecter Mollie)',
];

const StatusBadge = ({ ok, okLabel, koLabel }) => (
  ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {okLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
      <Unplug className="h-3.5 w-3.5" />
      {koLabel}
    </span>
  )
);

const DetailRow = ({ label, value, copyable = false }) => {
  const copyValue = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('URL copiée');
    } catch (_error) {
      toast.error('Copie impossible');
    }
  };

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-slate-800 break-all">{value || '–'}</span>
        {copyable && value ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2" onClick={() => void copyValue()}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </dd>
    </div>
  );
};

export const OpsIntegrationsPage = () => {
  const { currentUser } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const canManageIntegrations = OPS_INTEGRATION_ROLES.has(String(currentUser?.role || '').toUpperCase());

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!canManageIntegrations) {
      setPaymentStatus(null);
      setConnectStatus(null);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [paymentPayload, connectPayload] = await Promise.all([
        getMolliePaymentStatus(),
        getMollieConnectStatus(),
      ]);
      setPaymentStatus(paymentPayload || null);
      setConnectStatus(connectPayload || null);
    } catch (error) {
      setPaymentStatus(null);
      setConnectStatus(null);
      toast.error('Impossible de charger les statuts Mollie.', {
        description: error?.message || 'Erreur réseau',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManageIntegrations]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const result = searchParams.get('mollieConnect');
    if (!result) return;

    const message = CALLBACK_MESSAGES[result] || 'Retour OAuth Mollie inattendu.';
    if (result === 'success') {
      toast.success(message, {
        description: searchParams.get('org') ? `Organisation ${searchParams.get('org')}` : undefined,
      });
    } else {
      const reason = searchParams.get('reason');
      toast.error(message, { description: reason || undefined });
    }

    setSearchParams({}, { replace: true });
    void loadStatus({ silent: true });
  }, [loadStatus, searchParams, setSearchParams]);

  const handleConnectMollie = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const payload = await getMollieConnectAuthorize();
      const authorizeUrl = payload?.authorizeUrl;
      if (!authorizeUrl) {
        throw new Error('URL d’autorisation Mollie manquante');
      }
      window.location.assign(authorizeUrl);
    } catch (error) {
      toast.error('Impossible de démarrer la connexion Mollie.', {
        description: error?.payload?.error || error?.message || 'Erreur serveur',
      });
      setConnecting(false);
    }
  };

  const connectedCount = useMemo(() => {
    const value = connectStatus?.connectedAccounts;
    return Number.isFinite(value) ? value : null;
  }, [connectStatus?.connectedAccounts]);

  if (!canManageIntegrations) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Accès réservé à l’équipe ops intégrations</p>
        <p className="mt-2 text-sm text-slate-600">
          Seuls les profils Admin et Ops peuvent gérer les intégrations Mollie.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops · Intégrations</p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Mollie – deux applications</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Paiements B2C clients (clé API) et Connect Partners (OAuth plateforme). Les secrets restent
            côté API ; cette page affiche uniquement l’état de configuration.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="bg-white"
          disabled={refreshing}
          onClick={() => void loadStatus({ silent: true })}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <PageLoadingState compact className="py-8" label="Chargement des statuts Mollie…" />
        </section>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">Paiements Greffio (B2C)</h3>
                <StatusBadge
                  ok={paymentStatus?.configured}
                  okLabel="Clé API configurée"
                  koLabel="Clé API manquante"
                />
                {paymentStatus?.paymentOAuthConfigured ? (
                  <StatusBadge ok okLabel="OAuth app enregistrée" koLabel="" />
                ) : null}
                {paymentStatus?.callbackUrlMatch === false ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    Callback URL à vérifier
                  </span>
                ) : null}
              </div>

              <dl className="grid gap-3 text-sm">
                <DetailRow label="Profil Mollie" value={paymentStatus?.profileId} />
                <DetailRow label="Callback URL (dashboard)" value={paymentStatus?.callbackUrl} copyable />
                <DetailRow label="Webhook URL" value={paymentStatus?.webhookUrl} copyable />
                <DetailRow label="Client OAuth (app Greffio)" value={paymentStatus?.paymentOAuthClientId} />
              </dl>

              {!paymentStatus?.configured ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Variables serveur requises : MOLLIE_API_KEY, MOLLIE_PROFILE_ID, MOLLIE_CALLBACK_URL,
                    MOLLIE_WEBHOOK_URL.
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link2 className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">Connect Partners</h3>
                <StatusBadge
                  ok={connectStatus?.configured}
                  okLabel="OAuth configuré"
                  koLabel="OAuth non configuré"
                />
                {connectedCount != null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {connectedCount > 0
                      ? `${connectedCount} compte${connectedCount > 1 ? 's' : ''} connecté${connectedCount > 1 ? 's' : ''}`
                      : 'Aucun compte connecté'}
                  </span>
                ) : null}
              </div>

              <dl className="grid gap-3 text-sm">
                <DetailRow label="Client OAuth (Connect for Partners)" value={connectStatus?.clientId} />
                <DetailRow label="Redirect URI" value={connectStatus?.redirectUri} copyable />
                <DetailRow label="Scopes" value={connectStatus?.scopes} />
              </dl>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  {connectStatus?.configured
                    ? 'Lancez le flux OAuth pour lier ou relier un compte organisation partenaire.'
                    : 'Configurez MOLLIE_OAUTH_* (app Connect for Partners) sur l’API avant de connecter.'}
                </p>
                <Button
                  type="button"
                  disabled={!connectStatus?.configured || connecting}
                  onClick={() => void handleConnectMollie()}
                >
                  <Plug className={`mr-2 h-4 w-4 ${connecting ? 'animate-pulse' : ''}`} />
                  {connecting ? 'Redirection…' : 'Connecter Mollie'}
                </Button>
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <h3 className="text-base font-bold text-slate-900">Checklist callbacks Mollie</h3>
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              {CALLBACK_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {paymentStatus?.callbackUrlMatch === false ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  La callback URL configurée côté serveur ne correspond pas au dashboard Mollie.
                  Copiez l’URL affichée ci-dessus et mettez-la à jour dans Mollie.
                </p>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
};
