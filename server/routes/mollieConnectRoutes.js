import { randomBytes } from 'node:crypto';
import {
  buildMollieConnectAuthorizeUrl,
  describeMollieConnectStatus,
  exchangeMollieConnectCode,
  fetchMollieConnectOrganization,
  isMollieConnectConfigured,
} from '../services/mollie/mollieConnectService.js';
import {
  consumeMollieConnectOAuthState,
  countMollieConnectAccounts,
  createMollieConnectOAuthState,
  upsertMollieConnectAccount,
} from '../mollieConnectStore.js';

/**
 * Routes OAuth Mollie Connect (onboarding partenaires / sous-comptes).
 * Greffio agit comme plateforme ; les tokens ne doivent jamais être exposés au frontend.
 */
export const registerMollieConnectRoutes = (app, { requireAuth, requireRole }) => {
  app.get('/api/mollie/connect/status', requireAuth, requireRole(['ADMIN', 'OPS']), async (_req, res) => {
    const connectedAccounts = await countMollieConnectAccounts().catch(() => null);
    return res.json({ ok: true, ...describeMollieConnectStatus({ connectedAccounts }) });
  });

  app.get('/api/mollie/connect/authorize', requireAuth, requireRole(['ADMIN', 'OPS']), async (req, res) => {
    if (!isMollieConnectConfigured()) {
      return res.status(503).json({ ok: false, error: 'MOLLIE_CONNECT_NOT_CONFIGURED' });
    }
    const state = randomBytes(16).toString('hex');
    try {
      await createMollieConnectOAuthState({ userId: req.auth.sub, state });
    } catch (stateError) {
      console.error('[mollie-connect] failed to persist OAuth state', stateError);
      return res.status(500).json({ ok: false, error: 'MOLLIE_CONNECT_STATE_PERSIST_FAILED' });
    }
    const authorizeUrl = buildMollieConnectAuthorizeUrl({ state });
    return res.json({ ok: true, authorizeUrl, state });
  });

  app.get('/api/mollie/connect/callback', async (req, res) => {
    const appUrl = process.env.APP_URL || 'https://greffio.willentreprises.com';
    const code = String(req.query.code || '').trim();
    const state = String(req.query.state || '').trim();
    const error = String(req.query.error || '').trim();
    if (error) {
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=error&reason=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=missing_code`);
    }
    if (!state) {
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=missing_state`);
    }
    if (!isMollieConnectConfigured()) {
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=not_configured`);
    }

    const stateResult = await consumeMollieConnectOAuthState({ state });
    if (!stateResult.ok) {
      console.warn('[mollie-connect] invalid OAuth state', stateResult.error);
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=invalid_state&reason=${encodeURIComponent(stateResult.error)}`);
    }

    try {
      const tokens = await exchangeMollieConnectCode({ code });
      const organization = await fetchMollieConnectOrganization({ accessToken: tokens.access_token });
      const organizationId = organization?.id || organization?._links?.self?.href?.split('/').pop();
      if (!organizationId) {
        throw new Error('MOLLIE_CONNECT_ORG_ID_MISSING');
      }

      await upsertMollieConnectAccount({
        organizationId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
        initiatedByUserId: stateResult.userId,
        metadata: {
          organizationName: organization?.name || null,
          organizationEmail: organization?.email || null,
        },
      });

      console.log('[mollie-connect] OAuth tokens persisted', {
        organizationId,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
      });
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=success&org=${encodeURIComponent(organizationId)}`);
    } catch (tokenError) {
      console.error('[mollie-connect] token exchange failed', tokenError);
      return res.redirect(302, `${appUrl}/ops/integrations?mollieConnect=token_failed`);
    }
  });
};
