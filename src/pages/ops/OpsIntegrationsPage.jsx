import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Link2, Plug, RefreshCw, Unplug, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '@/context/AuthContext.jsx';
import { getMollieConnectAuthorize, getMollieConnectStatus } from '@/api/ops.js';
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

export const OpsIntegrationsPage = () => {
  const { currentUser } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const canManageIntegrations = OPS_INTEGRATION_ROLES.has(String(currentUser?.role || '').toUpperCase());

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!canManageIntegrations) {
      setStatus(null);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const payload = await getMollieConnectStatus();
      setStatus(payload || null);
    } catch (error) {
      setStatus(null);
      toast.error('Impossible de charger le statut Mollie Connect.', {
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
    const value = status?.connectedAccounts;
    return Number.isFinite(value) ? value : null;
  }, [status?.connectedAccounts]);

  if (!canManageIntegrations) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Accès réservé à l’équipe ops intégrations</p>
        <p className="mt-2 text-sm text-slate-600">
          Seuls les profils Admin et Ops peuvent connecter Mollie Connect.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Greffio Ops · Intégrations</p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Paiements Mollie Connect</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Connectez le compte plateforme Mollie pour activer l’onboarding partenaires et les paiements
            sous-comptes. Les tokens OAuth restent chiffrés côté API.
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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <PageLoadingState compact className="py-8" label="Chargement du statut Mollie…" />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {status?.configured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  OAuth configuré
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                  <Unplug className="h-3.5 w-3.5" />
                  OAuth non configuré
                </span>
              )}
              {connectedCount != null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  <Link2 className="h-3.5 w-3.5" />
                  {connectedCount > 0
                    ? `${connectedCount} compte${connectedCount > 1 ? 's' : ''} connecté${connectedCount > 1 ? 's' : ''}`
                    : 'Aucun compte connecté'}
                </span>
              ) : null}
            </div>

            <dl className="grid gap-3 text-sm">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Client OAuth</dt>
                <dd className="mt-1 font-mono text-xs text-slate-800 break-all">
                  {status?.clientId || '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Redirect URI</dt>
                <dd className="mt-1 font-mono text-xs text-slate-800 break-all">
                  {status?.redirectUri || '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Scopes</dt>
                <dd className="mt-1 text-xs text-slate-800 break-words">
                  {status?.scopes || '—'}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                {status?.configured
                  ? 'Lancez le flux OAuth Mollie pour lier ou relier un compte organisation.'
                  : 'Configurez MOLLIE_OAUTH_* sur l’API avant de connecter.'}
              </p>
              <Button
                type="button"
                disabled={!status?.configured || connecting}
                onClick={() => void handleConnectMollie()}
              >
                <Plug className={`mr-2 h-4 w-4 ${connecting ? 'animate-pulse' : ''}`} />
                {connecting ? 'Redirection…' : 'Connecter Mollie'}
              </Button>
            </div>

            {!status?.configured ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Variables serveur requises : MOLLIE_OAUTH_CLIENT_ID, MOLLIE_OAUTH_CLIENT_SECRET,
                  MOLLIE_CONNECT_REDIRECT_URI.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
};
