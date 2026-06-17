import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
import {
  buildDocumentWorkspaceCapabilities,
  canFreeEditDocument,
  canGuidedEditDocument,
  isDocumentSignedLocked,
  isDocumentWorkspaceEnabled,
  isWorkspaceDocKeyAllowed,
} from '../services/documentWorkspacePolicy.js';
import {
  createEditorLaunchUrl,
  GuidedFormProvider,
  OnlyOfficeProvider,
  resolveDefaultEditorProvider,
} from '../services/documentEditorProviderService.js';
import {
  createSession,
  getSession,
  isSessionExpired,
  markClosed,
} from '../services/documentEditorSessionService.js';
import {
  createVersionFromEditorSave,
  getCurrentPdfVersion,
  getCurrentVersion,
  listVersions,
} from '../services/documentVersionService.js';
import { downloadDocumentBufferFromConfiguredStorage } from '../services/objectStorage.js';
import {
  bootstrapDocumentVersionFromRecord,
  ensureStatutesDocxEditVersion,
} from '../services/statutesDocxVersionService.js';
import {
  getStatutesWorkflowLabel,
  getStatutesWorkflowStatus,
  transitionStatutesWorkflow,
} from '../domain/statutesWorkflow.js';
import { DOCUMENT_STATUSES } from '../domain/documentStatus.js';

const mapVersionResponse = (version) => {
  if (!version) return null;
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    origin: version.origin,
    status: version.status,
    fileFormat: version.fileFormat,
    sha256: version.sha256,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    isCurrent: version.isCurrent,
  };
};

const resolveDocumentRecord = async (listDossierDocuments, dossierId, docKey) => {
  const documents = await listDossierDocuments(dossierId);
  return documents.find((item) => item.docKey === docKey) || null;
};

const buildWorkspacePayload = async ({ dossierId, docKey, document, dossier = null, user = null }) => {
  let currentVersion = null;
  let currentPdfVersion = null;
  let versionsCount = 0;

  try {
    if (document && (document.storageUrl || document.fileUrl)) {
      await bootstrapDocumentVersionFromRecord({
        dossierId,
        docKey,
        document,
      });
    }
    currentVersion = await getCurrentVersion(dossierId, docKey);
    currentPdfVersion = await getCurrentPdfVersion(dossierId, docKey);
    versionsCount = (await listVersions(dossierId, docKey, { limit: 100 })).length;
  } catch (versionError) {
    console.warn('[document-workspace] version metadata unavailable', {
      dossierId,
      docKey,
      message: versionError?.message,
    });
  }

  const capabilities = buildDocumentWorkspaceCapabilities({ docKey, document });
  const config = getEditableDocumentConfig(docKey);

  return {
    ok: true,
    docKey,
    title: config?.title || document?.label || docKey,
    status: currentPdfVersion?.status || currentVersion?.status || 'draft',
    enabled: isDocumentWorkspaceEnabled() && isWorkspaceDocKeyAllowed(docKey),
    capabilities,
    currentVersion: mapVersionResponse(currentVersion),
    currentPdfVersion: mapVersionResponse(currentPdfVersion),
    versionsCount,
    lastEditedAt: currentVersion?.updatedAt || document?.updatedAt || null,
    signedLocked: isDocumentSignedLocked(document),
    defaultProvider: resolveDefaultEditorProvider({ docKey }),
    statutesWorkflow: docKey === 'signed_statutes' ? {
      status: getStatutesWorkflowStatus(document),
      label: getStatutesWorkflowLabel(document),
    } : null,
    guidedEditorPath: GuidedFormProvider.resolveEditorPath({ dossierId, docKey }),
  };
};

const handleCreateEditSession = async (req, res, {
  preferFreeEdit = false,
  appUrl,
  resolveDossierAccess,
  listDossierDocuments,
  getDossier,
  getUserById,
}) => {
  const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

  const docKey = String(req.params.docKey || '');
  const document = await resolveDocumentRecord(listDossierDocuments, access.dossier.id, docKey);
  const providerId = String(
    req.body?.provider || resolveDefaultEditorProvider({
      preferFreeEdit: preferFreeEdit || Boolean(req.body?.preferFreeEdit),
      docKey,
    }),
  );
  const presentation = String(req.body?.presentation || 'desktop').toLowerCase() === 'mobile'
    ? 'mobile'
    : 'desktop';

  if (!isWorkspaceDocKeyAllowed(docKey)) {
    return res.status(400).json({ ok: false, error: 'DOCUMENT_WORKSPACE_UNSUPPORTED' });
  }
  if (isDocumentSignedLocked(document)) {
    return res.status(409).json({ ok: false, error: 'DOCUMENT_SIGNED_IMMUTABLE' });
  }

  if (providerId === 'guided_form') {
    if (!canGuidedEditDocument(docKey, document)) {
      return res.status(403).json({ ok: false, error: 'GUIDED_EDIT_FORBIDDEN' });
    }
    const resolvedLaunch = await createEditorLaunchUrl({
      providerId: 'guided_form',
      dossierId: access.dossier.id,
      docKey,
      appUrl,
    });
    if (!resolvedLaunch.ok) {
      return res.status(501).json({ ok: false, error: resolvedLaunch.error, message: resolvedLaunch.message });
    }
    return res.json(resolvedLaunch);
  }

  if (!canFreeEditDocument(docKey, document)) {
    const fallback = await createEditorLaunchUrl({
      providerId: 'guided_form',
      dossierId: access.dossier.id,
      docKey,
      appUrl,
    });
    return res.status(501).json({
      ok: false,
      error: 'FREE_EDIT_NOT_CONFIGURED',
      message: 'L’éditeur bureautique n’est pas disponible. Utilisez le formulaire Greffio.',
      fallback,
    });
  }

  let currentVersion;
  if (docKey === 'signed_statutes') {
    try {
      const dossierRecord = access.dossier || (getDossier ? await getDossier(access.dossier.id) : null);
      const questionnaire = dossierRecord?.dataJson ? JSON.parse(dossierRecord.dataJson) : {};
      const user = dossierRecord?.userId && getUserById
        ? await getUserById(dossierRecord.userId)
        : null;
      currentVersion = await ensureStatutesDocxEditVersion({
        dossierId: access.dossier.id,
        document,
        dossier: dossierRecord,
        questionnaire,
        user,
        createdBy: req.auth?.sub,
      });
    } catch (ensureError) {
      console.error('[document-workspace] statutes docx ensure failed', {
        dossierId: access.dossier.id,
        message: ensureError?.message,
      });
      return res.status(502).json({
        ok: false,
        error: 'STATUTES_DOCX_ENSURE_FAILED',
        message: 'Impossible de préparer la version DOCX des statuts pour ONLYOFFICE. Réessayez dans un instant.',
      });
    }
  } else {
    currentVersion = await getCurrentVersion(access.dossier.id, docKey);
  }

  const sourceStorageUrl = currentVersion?.storageUrl || document?.storageUrl || document?.fileUrl;
  if (!sourceStorageUrl) {
    return res.status(404).json({
      ok: false,
      error: docKey === 'signed_statutes' ? 'STATUTES_DOCX_ENSURE_FAILED' : 'SOURCE_VERSION_NOT_FOUND',
      message: docKey === 'signed_statutes'
        ? 'Impossible de préparer la version DOCX des statuts pour ONLYOFFICE.'
        : 'Version source introuvable.',
    });
  }

  const sessionFileFormat = currentVersion?.fileFormat
    || (docKey === 'signed_statutes' ? 'docx' : 'pdf');
  if (docKey === 'signed_statutes' && sessionFileFormat !== 'docx') {
    return res.status(422).json({
      ok: false,
      error: 'STATUTES_DOCX_REQUIRED',
      message: 'La version DOCX des statuts est requise pour l’éditeur ONLYOFFICE.',
    });
  }

  const freeEditProvider = providerId === 'onlyoffice' && OnlyOfficeProvider.isAvailable()
    ? 'onlyoffice'
    : 'collabora';

  const { session, accessToken } = await createSession({
    dossierId: access.dossier.id,
    docKey,
    documentVersionId: currentVersion?.id || null,
    provider: freeEditProvider,
    userId: req.auth?.sub,
    userEmail: req.auth?.email || null,
    fileFormat: sessionFileFormat,
    sourceStorageUrl,
    sourceSha256: currentVersion?.sha256 || document?.sha256 || null,
  });

  const launch = providerId === 'onlyoffice' || freeEditProvider === 'onlyoffice'
    ? await OnlyOfficeProvider.buildLaunchPayload({
      session,
      accessToken,
      appUrl,
      dossierId: access.dossier.id,
      docKey,
      document,
      currentVersion,
      presentation,
    })
    : await createEditorLaunchUrl({
      providerId: 'collabora',
      dossierId: access.dossier.id,
      docKey,
      session,
      accessToken,
      appUrl,
    });
  if (!launch?.ok) {
    return res.status(501).json({
      ok: false,
      error: launch?.error || 'FREE_EDIT_NOT_CONFIGURED',
      message: launch?.message || 'L’éditeur bureautique n’est pas disponible.',
      fallback: launch?.fallback || null,
    });
  }
  return res.json({
    ...launch,
    sessionId: session.id,
  });
};

export const registerDocumentWorkspaceRoutes = (app, {
  requireAuth,
  resolveDossierAccess,
  listDossierDocuments,
  updateDossierDocument,
  requireRole,
  appUrl,
  getDossier,
  getUserById,
}) => {
  app.get('/api/dossiers/:dossierId/documents/:docKey/download-source', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
    if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

    const docKey = String(req.params.docKey || '');
    if (!isWorkspaceDocKeyAllowed(docKey)) {
      return res.status(400).json({ ok: false, error: 'DOCUMENT_WORKSPACE_UNSUPPORTED' });
    }

    const requestedFormat = String(req.query.format || 'docx').toLowerCase();
    const document = await resolveDocumentRecord(listDossierDocuments, access.dossier.id, docKey);
    const currentVersion = await getCurrentVersion(access.dossier.id, docKey);
    const sourceStorageUrl = currentVersion?.storageUrl
      || document?.metadata?.lastDocxStorageUrl
      || null;
    const fileFormat = currentVersion?.fileFormat || requestedFormat;

    if (!sourceStorageUrl || fileFormat !== requestedFormat) {
      return res.status(404).json({
        ok: false,
        error: 'SOURCE_FILE_NOT_FOUND',
        message: `Aucune version ${requestedFormat.toUpperCase()} disponible pour ce document.`,
      });
    }

    try {
      const buffer = await downloadDocumentBufferFromConfiguredStorage(sourceStorageUrl);
      const mime = requestedFormat === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : requestedFormat === 'odt'
          ? 'application/vnd.oasis.opendocument.text'
          : 'application/pdf';
      const downloadName = `${docKey}.${requestedFormat}`;
      res.setHeader('Content-Type', mime);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      );
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(buffer.length));
      return res.send(buffer);
    } catch (error) {
      console.error('[document-workspace] source download failed', {
        dossierId: access.dossier.id,
        docKey,
        message: error?.message,
      });
      return res.status(404).json({ ok: false, error: 'SOURCE_FILE_NOT_FOUND' });
    }
  });

  app.get('/api/dossiers/:dossierId/documents/:docKey/workspace', requireAuth, async (req, res) => {
    try {
      const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
      if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

      const docKey = String(req.params.docKey || '');
      if (!isWorkspaceDocKeyAllowed(docKey)) {
        return res.status(400).json({ ok: false, error: 'DOCUMENT_WORKSPACE_UNSUPPORTED' });
      }

      const document = await resolveDocumentRecord(listDossierDocuments, access.dossier.id, docKey);
      const payload = await buildWorkspacePayload({
        dossierId: access.dossier.id,
        docKey,
        document,
        dossier: access.dossier,
      });
      return res.json(payload);
    } catch (error) {
      console.error('[document-workspace] workspace load failed', {
        dossierId: req.params.dossierId,
        docKey: req.params.docKey,
        message: error?.message,
      });
      return res.status(500).json({
        ok: false,
        error: 'DOCUMENT_WORKSPACE_UNAVAILABLE',
        message: 'Impossible de charger les métadonnées du document.',
      });
    }
  });

  app.get('/api/dossiers/:dossierId/documents/:docKey/versions', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
    if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

    const docKey = String(req.params.docKey || '');
    if (!isWorkspaceDocKeyAllowed(docKey)) {
      return res.status(400).json({ ok: false, error: 'DOCUMENT_WORKSPACE_UNSUPPORTED' });
    }

    const limit = Number.parseInt(String(req.query.limit || '20'), 10);
    const items = await listVersions(access.dossier.id, docKey, { limit });
    return res.json({
      ok: true,
      items: items.map(mapVersionResponse),
    });
  });

  app.post('/api/dossiers/:dossierId/documents/:docKey/edit/session', requireAuth, async (req, res) => (
    handleCreateEditSession(req, res, {
      preferFreeEdit: false,
      appUrl,
      resolveDossierAccess,
      listDossierDocuments,
      getDossier,
      getUserById,
    })
  ));

  app.post('/api/dossiers/:dossierId/documents/:docKey/free-edit/session', requireAuth, async (req, res) => (
    handleCreateEditSession(req, res, {
      preferFreeEdit: true,
      appUrl,
      resolveDossierAccess,
      listDossierDocuments,
      getDossier,
      getUserById,
    })
  ));

  app.post('/api/dossiers/:dossierId/documents/:docKey/free-edit/:sessionId/close', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
    if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

    const session = await getSession(req.params.sessionId);
    if (!session || session.dossierId !== access.dossier.id || session.docKey !== req.params.docKey) {
      return res.status(404).json({ ok: false, error: 'SESSION_NOT_FOUND' });
    }
    if (isSessionExpired(session)) {
      return res.status(401).json({ ok: false, error: 'SESSION_EXPIRED' });
    }

    const closed = await markClosed(session.id);
    return res.json({
      ok: true,
      status: closed?.status || 'closed',
      resultVersionId: closed?.resultVersionId || null,
    });
  });

  app.get('/api/dossiers/:dossierId/documents/:docKey/free-edit/:sessionId/status', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
    if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

    const session = await getSession(req.params.sessionId);
    if (!session || session.dossierId !== access.dossier.id || session.docKey !== req.params.docKey) {
      return res.status(404).json({ ok: false, error: 'SESSION_NOT_FOUND' });
    }

    return res.json({
      ok: true,
      sessionId: session.id,
      status: session.status,
      lastCallbackAt: session.lastCallbackAt,
      resultVersionId: session.resultVersionId,
      pdfUpdatedAt: session.metadata?.pdfUpdatedAt || null,
      pdfVersionId: session.metadata?.pdfVersionId || null,
    });
  });

  app.post('/api/dossiers/:dossierId/documents/signed_statutes/workflow', requireAuth, async (req, res) => {
    const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
    if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

    const action = String(req.body?.action || '').trim().toLowerCase();
    const document = await resolveDocumentRecord(listDossierDocuments, access.dossier.id, 'signed_statutes');
    if (!document) {
      return res.status(404).json({ ok: false, error: 'STATUTES_DOCUMENT_NOT_FOUND' });
    }

    const isOps = ['ADMIN', 'OPS', 'FORMALISTE'].includes(String(req.auth?.role || '').toUpperCase());
    const currentStatus = getStatutesWorkflowStatus(document);
    const transition = transitionStatutesWorkflow({ currentStatus, action, isOps });
    if (!transition.ok) {
      return res.status(409).json({ ok: false, error: transition.error, currentStatus });
    }

    const nextMetadata = {
      ...(document.metadata || {}),
      statutesWorkflowStatus: transition.nextStatus,
      unsigned: transition.nextStatus !== 'signed',
      awaitingSignature: transition.nextStatus === 'validated',
    };
    let nextDocumentStatus = document.status;
    if (transition.nextStatus === 'pending_ops_review') {
      nextDocumentStatus = DOCUMENT_STATUSES.UNDER_REVIEW;
    } else if (transition.nextStatus === 'validated') {
      nextDocumentStatus = DOCUMENT_STATUSES.VALID;
    } else if (transition.nextStatus === 'pending_client_review') {
      nextDocumentStatus = DOCUMENT_STATUSES.UPLOADED;
    }

    if (!updateDossierDocument) {
      return res.status(501).json({ ok: false, error: 'STATUTES_WORKFLOW_NOT_AVAILABLE' });
    }

    const updated = await updateDossierDocument({
      dossierId: access.dossier.id,
      docKey: 'signed_statutes',
      status: nextDocumentStatus,
      metadata: nextMetadata,
      reviewerId: isOps ? req.auth?.sub : null,
    });

    return res.json({
      ok: true,
      action,
      statutesWorkflowStatus: transition.nextStatus,
      label: getStatutesWorkflowLabel({ metadata: nextMetadata }),
      document: updated,
    });
  });
};

export const maybeCreateVersionAfterEditorSave = async ({
  dossierId,
  docKey,
  document,
  storageUrl,
  sha256,
  fileSizeBytes,
  createdBy,
  metadata = {},
}) => {
  if (!isDocumentWorkspaceEnabled() || !isWorkspaceDocKeyAllowed(docKey)) {
    return null;
  }
  return createVersionFromEditorSave({
    dossierId,
    docKey,
    document,
    storageUrl,
    sha256,
    fileSizeBytes,
    createdBy,
    metadata,
  });
};

export const buildEditorWorkspaceBlock = async ({ dossierId, docKey, document }) => {
  if (!isDocumentWorkspaceEnabled() || !isWorkspaceDocKeyAllowed(docKey)) {
    return {
      enabled: false,
      freeEditEnabled: false,
      canFreeEdit: false,
      canGuidedEdit: false,
    };
  }
  const currentVersion = await getCurrentVersion(dossierId, docKey);
  const currentPdfVersion = await getCurrentPdfVersion(dossierId, docKey);
  const capabilities = buildDocumentWorkspaceCapabilities({ docKey, document });
  return {
    enabled: true,
    freeEditEnabled: capabilities.freeEdit,
    currentVersionId: currentVersion?.id || null,
    currentPdfVersionId: currentPdfVersion?.id || null,
    status: currentPdfVersion?.status || currentVersion?.status || 'draft',
    canFreeEdit: capabilities.freeEdit,
    canGuidedEdit: capabilities.guidedEdit,
    canSign: !isDocumentSignedLocked(document),
    canValidate: capabilities.validate,
    versionsCount: (await listVersions(dossierId, docKey, { limit: 100 })).length,
    lastEditedAt: currentVersion?.updatedAt || null,
    guidedEditorPath: GuidedFormProvider.resolveEditorPath({ dossierId, docKey }),
  };
};
