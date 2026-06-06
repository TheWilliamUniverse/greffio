import {
  DOCUMENT_STATUSES,
  listDossierDocuments,
  updateDossierDocument,
} from '../../store.js';

const mergeDocumentMetadata = (existing = {}, patch = {}) => ({
  ...(existing && typeof existing === 'object' ? existing : {}),
  ...patch,
});

export const applyIdentityVerificationToDocument = async (verification) => {
  if (!verification?.dossier_id && !verification?.dossierId) {
    return { ok: false, error: 'MISSING_DOSSIER' };
  }

  const dossierId = verification.dossier_id || verification.dossierId;
  const docKey = verification.triggered_by_doc_key || verification.triggeredByDocKey || 'identity_proof';
  const status = String(verification.status || '').toLowerCase();
  const docs = await listDossierDocuments(dossierId);
  const existing = docs.find((item) => item.docKey === docKey);
  if (!existing) return { ok: false, error: 'DOCUMENT_NOT_FOUND' };

  const identityMeta = {
    identityVerification: {
      provider: verification.provider || 'didit',
      status,
      sessionId: verification.provider_session_id || verification.providerSessionId || null,
      at: new Date().toISOString(),
    },
  };

  if (status === 'approved') {
    await updateDossierDocument({
      dossierId,
      docKey,
      status: DOCUMENT_STATUSES.VALID,
      reviewerId: 'didit',
      metadata: mergeDocumentMetadata(existing.metadata, identityMeta),
    });
    return { ok: true, documentStatus: DOCUMENT_STATUSES.VALID };
  }

  if (status === 'declined' || status === 'expired') {
    await updateDossierDocument({
      dossierId,
      docKey,
      status: DOCUMENT_STATUSES.INVALID,
      rejectedReason: status === 'declined'
        ? 'Vérification Didit refusée'
        : 'Session Didit expirée',
      reviewerId: 'didit',
      metadata: mergeDocumentMetadata(existing.metadata, identityMeta),
    });
    return { ok: true, documentStatus: DOCUMENT_STATUSES.INVALID };
  }

  if (['pending_user', 'under_review', 'session_created'].includes(status)) {
    const hasFile = Boolean(existing.filename || existing.storageUrl || existing.fileUrl);
    if (hasFile && existing.status !== DOCUMENT_STATUSES.VALID) {
      await updateDossierDocument({
        dossierId,
        docKey,
        status: DOCUMENT_STATUSES.UNDER_REVIEW,
        reviewerId: 'didit',
        metadata: mergeDocumentMetadata(existing.metadata, identityMeta),
      });
      return { ok: true, documentStatus: DOCUMENT_STATUSES.UNDER_REVIEW };
    }
  }

  return { ok: true, documentStatus: existing.status };
};
