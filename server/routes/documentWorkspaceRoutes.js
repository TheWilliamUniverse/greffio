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

const buildWorkspacePayload = async ({ dossierId, docKey, document }) => {
  const currentVersion = await getCurrentVersion(dossierId, docKey);
  const currentPdfVersion = await getCurrentPdfVersion(dossierId, docKey);
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
    versionsCount: (await listVersions(dossierId, docKey, { limit: 100 })).length,
    lastEditedAt: currentVersion?.updatedAt || document?.updatedAt || null,
    signedLocked: isDocumentSignedLocked(document),
    defaultProvider: resolveDefaultEditorProvider(),
    guidedEditorPath: GuidedFormProvider.resolveEditorPath({ dossierId, docKey }),
  };
};

const handleCreateEditSession = async (req, res, { preferFreeEdit = false, appUrl, resolveDossierAccess, listDossierDocuments }) => {
  const access = await resolveDossierAccess(req, req.params.dossierId, { allowClaim: true });
  if (!access.ok) return res.status(access.status).json({ ok: false, error: access.error });

  const docKey = String(req.params.docKey || '');
  const document = await resolveDocumentRecord(listDossierDocuments, access.dossier.id, docKey);
  const providerId = String(
    req.body?.provider || resolveDefaultEditorProvider({ preferFreeEdit: preferFreeEdit || Boolean(req.body?.preferFreeEdit) }),
  );

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
    const launch = createEditorLaunchUrl({
      providerId: 'guided_form',
      dossierId: access.dossier.id,
      docKey,
      appUrl,
    });
    if (!launch.ok) {
      return res.status(501).json({ ok: false, error: launch.error, message: launch.message });
    }
    return res.json(launch);
  }

  if (!canFreeEditDocument(docKey, document)) {
    const fallback = createEditorLaunchUrl({
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

  const currentVersion = await getCurrentVersion(access.dossier.id, docKey);
  const sourceStorageUrl = currentVersion?.storageUrl || document?.storageUrl || document?.fileUrl;
  if (!sourceStorageUrl) {
    return res.status(404).json({ ok: false, error: 'SOURCE_VERSION_NOT_FOUND' });
  }

  const { session, accessToken } = await createSession({
    dossierId: access.dossier.id,
    docKey,
    documentVersionId: currentVersion?.id || null,
    provider: 'collabora',
    userId: req.auth?.sub,
    userEmail: req.auth?.email || null,
    fileFormat: currentVersion?.fileFormat || 'pdf',
    sourceStorageUrl,
    sourceSha256: currentVersion?.sha256 || document?.sha256 || null,
  });

  const launch = createEditorLaunchUrl({
    providerId: 'collabora',
    dossierId: access.dossier.id,
    docKey,
    session,
    accessToken,
    appUrl,
  });
  return res.json({
    ...launch,
    sessionId: session.id,
  });
};

export const registerDocumentWorkspaceRoutes = (app, {
  requireAuth,
  resolveDossierAccess,
  listDossierDocuments,
  appUrl,
}) => {
  app.get('/api/dossiers/:dossierId/documents/:docKey/workspace', requireAuth, async (req, res) => {
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
    });
    return res.json(payload);
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
    })
  ));

  app.post('/api/dossiers/:dossierId/documents/:docKey/free-edit/session', requireAuth, async (req, res) => (
    handleCreateEditSession(req, res, {
      preferFreeEdit: true,
      appUrl,
      resolveDossierAccess,
      listDossierDocuments,
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
