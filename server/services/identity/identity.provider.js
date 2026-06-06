import {
  createDiditVerificationSession,
  getDiditSessionDecision,
  isDiditConfigured,
  mapDiditStatus,
} from './didit.service.js';
import {
  getLatestIdentityVerification,
  upsertIdentityVerification,
  updateIdentityVerificationBySessionId,
} from './identityStore.js';
import { applyIdentityVerificationToDocument } from './identityDocumentSync.js';

export { isDiditConfigured } from './didit.service.js';

export const startIdentityVerificationForDossier = async ({
  dossierId,
  userId,
  email,
  triggeredByDocKey = 'identity_proof',
}) => {
  if (!isDiditConfigured()) {
    return { ok: false, error: 'IDENTITY_PROVIDER_NOT_CONFIGURED' };
  }

  const latest = await getLatestIdentityVerification(dossierId);
  if (latest && ['pending_user', 'session_created', 'under_review'].includes(latest.status)) {
    return {
      ok: true,
      reused: true,
      verification: latest,
    };
  }

  const callbackUrl = `${process.env.APP_URL || 'https://greffio.willentreprises.com'}/documents?dossier=${encodeURIComponent(dossierId)}&identity=done`;
  const session = await createDiditVerificationSession({
    dossierId,
    userId,
    email,
    callbackUrl,
    metadata: { triggeredByDocKey },
  });

  if (!session.ok) {
    return session;
  }

  const verification = await upsertIdentityVerification({
    dossierId,
    userId,
    provider: 'didit',
    providerSessionId: session.sessionId,
    status: session.status || 'session_created',
    verificationUrl: session.verificationUrl,
    result: { session: session.raw },
    triggeredByDocKey,
  });

  await applyIdentityVerificationToDocument(verification);

  return { ok: true, verification };
};

export const refreshIdentityVerificationStatus = async (dossierId) => {
  const latest = await getLatestIdentityVerification(dossierId);
  if (!latest?.provider_session_id) {
    return { ok: false, error: 'NO_SESSION' };
  }
  const decision = await getDiditSessionDecision(latest.provider_session_id);
  if (!decision.ok) return decision;

  const verification = await updateIdentityVerificationBySessionId(latest.provider_session_id, {
    status: decision.status,
    result: decision.raw,
  });
  if (verification) {
    await applyIdentityVerificationToDocument(verification);
  }
  return { ok: true, verification };
};

export const handleDiditWebhookPayload = async (payload = {}) => {
  const sessionId = payload.session_id || payload.sessionId;
  if (!sessionId) return { ok: false, error: 'MISSING_SESSION_ID' };

  const status = mapDiditStatus(payload.status || payload.decision || payload.event);
  const verification = await updateIdentityVerificationBySessionId(sessionId, {
    status,
    result: payload,
  });
  if (verification) {
    await applyIdentityVerificationToDocument(verification);
  }
  return { ok: Boolean(verification), verification };
};
