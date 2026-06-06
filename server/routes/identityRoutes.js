import { Router } from 'express';
import { requireAuth } from '../authMiddleware.js';
import { resolveDossierAccess } from '../utils/dossierAccess.js';
import { getLatestIdentityVerification } from '../services/identity/identityStore.js';
import {
  handleDiditWebhookPayload,
  isDiditConfigured,
  refreshIdentityVerificationStatus,
  startIdentityVerificationForDossier,
} from '../services/identity/identity.provider.js';
import { verifyDiditWebhookSignature } from '../services/identity/didit.service.js';

const router = Router();

const serializeVerification = (verification) => {
  if (!verification) return null;
  return {
    id: verification.id,
    status: verification.status,
    verificationUrl: verification.verification_url,
    provider: verification.provider,
    updatedAt: verification.updated_at,
  };
};

router.get('/status/:dossierId', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

  const verification = await getLatestIdentityVerification(access.dossier.id);
  return res.json({
    ok: true,
    configured: isDiditConfigured(),
    verification: serializeVerification(verification),
  });
});

router.post('/start/:dossierId', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

  const dossierData = access.dossier.dataJson ? JSON.parse(access.dossier.dataJson) : {};
  const result = await startIdentityVerificationForDossier({
    dossierId: access.dossier.id,
    userId: req.auth.sub,
    email: req.auth.email || dossierData.email || null,
    triggeredByDocKey: req.body?.docKey || 'identity_proof',
  });

  if (!result.ok) {
    const status = result.error === 'IDENTITY_PROVIDER_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json(result);
  }

  return res.json({
    ok: true,
    reused: Boolean(result.reused),
    verification: serializeVerification(result.verification),
  });
});

router.post('/refresh/:dossierId', requireAuth, async (req, res) => {
  const access = await resolveDossierAccess(req, req.params.dossierId);
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

  const result = await refreshIdentityVerificationStatus(access.dossier.id);
  if (!result.ok) return res.status(404).json(result);
  return res.json({
    ok: true,
    verification: serializeVerification(result.verification),
  });
});

export const createDiditWebhookHandler = () => async (req, res) => {
  try {
    const rawBody = typeof req.body === 'string' ? req.body : (req.rawBody || '');
    const signature = req.headers['x-signature'] || req.headers['x-didit-signature'] || '';
    if (!verifyDiditWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ ok: false, error: 'INVALID_WEBHOOK_SIGNATURE' });
    }
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const result = await handleDiditWebhookPayload(payload);
    return res.json(result);
  } catch (error) {
    console.error('[identity] webhook error', error);
    return res.status(500).json({ ok: false, error: 'WEBHOOK_PROCESSING_FAILED' });
  }
};

export default router;
