import { createHash } from 'node:crypto';
import {
  buildOnlyOfficeDocumentKey,
  buildOnlyOfficeEditorConfig,
  convertDocumentViaOnlyOffice,
  getOnlyOfficeServerUrl,
  isOnlyOfficeConfigured,
  parseOnlyOfficeCallbackStatus,
  resolveOnlyOfficeFileType,
} from '../services/onlyofficeService.js';
import {
  getSession,
  getSessionByToken,
  isSessionExpired,
  markSaved,
  markSaving,
} from '../services/documentEditorSessionService.js';
import {
  createVersionFromEditorSave,
  createVersion,
  getCurrentVersion,
  syncDocumentVersionPointers,
} from '../services/documentVersionService.js';
import { downloadDocumentBufferFromConfiguredStorage, uploadDocumentToConfiguredStorage, createSignedDownloadUrl } from '../services/objectStorage.js';
import { detectBufferFileFormat, isDocxBuffer } from '../utils/fileFormatDetection.js';
import { isDocumentSignedLocked } from '../services/documentWorkspacePolicy.js';
import { canEditStatutesInOnlyOffice } from '../domain/statutesWorkflow.js';

const callbackOk = (res, extra = {}) => res.json({ error: 0, ...extra });

const resolveDocumentRecord = async (listDossierDocuments, dossierId, docKey) => {
  const documents = await listDossierDocuments(dossierId);
  return documents.find((item) => item.docKey === docKey) || null;
};

const persistOnlyOfficePdfPreview = async ({
  session,
  document,
  docxStorageUrl,
  createdBy,
}) => {
  const signed = await createSignedDownloadUrl(docxStorageUrl);
  const fileUrl = signed?.url;
  if (!fileUrl) {
    console.warn('ONLYOFFICE_PDF_PREVIEW_NO_SIGNED_URL', { docxStorageUrl });
    return null;
  }

  let pdfBuffer;
  try {
    pdfBuffer = await convertDocumentViaOnlyOffice({
      fileUrl,
      fileType: 'docx',
      outputType: 'pdf',
      key: buildOnlyOfficeDocumentKey({
        dossierId: session.dossierId,
        docKey: session.docKey,
        sessionId: session.id,
        sha256: session.sourceSha256,
      }),
    });
  } catch (error) {
    console.warn('ONLYOFFICE_PDF_PREVIEW_CONVERT_FAILED', error?.message || error);
    return null;
  }

  const sha256 = createHash('sha256').update(pdfBuffer).digest('hex');
  const uploadResult = await uploadDocumentToConfiguredStorage({
    dossierId: session.dossierId,
    docKey: session.docKey,
    buffer: pdfBuffer,
    originalFilename: `${session.docKey}_preview_${Date.now()}.pdf`,
    mimeType: 'application/pdf',
  });

  const currentDocx = await getCurrentVersion(session.dossierId, session.docKey);
  const pdfVersion = await createVersion({
    dossierId: session.dossierId,
    docKey: session.docKey,
    documentId: document?.id || null,
    origin: 'editor_free_pdf_preview',
    status: 'draft',
    fileFormat: 'pdf',
    mimeType: 'application/pdf',
    storageUrl: uploadResult.storageUrl,
    fileSizeBytes: pdfBuffer.length,
    sha256,
    contentHash: sha256,
    sourceVersionId: currentDocx?.id || null,
    editorProvider: 'onlyoffice',
    metadata: {
      sourceDocxStorageUrl: docxStorageUrl,
      generatedBy: 'onlyoffice_convert',
    },
    createdBy,
    markCurrent: false,
  });

  await syncDocumentVersionPointers({
    dossierId: session.dossierId,
    docKey: session.docKey,
    versionId: currentDocx?.id || pdfVersion.id,
    pdfVersionId: pdfVersion.id,
    lastFreeEditAt: new Date().toISOString(),
  });

  return { pdfVersion, uploadResult, sha256 };
};

export const registerOnlyOfficeRoutes = (app, {
  listDossierDocuments,
  updateDossierDocument,
  apiBaseUrl,
}) => {
  app.get('/api/onlyoffice/files/:sessionId/download', async (req, res) => {
    const accessToken = String(req.query.token || req.query.access_token || '');
    const session = await getSessionByToken(accessToken);
    if (!session || session.id !== req.params.sessionId) {
      return res.status(401).json({ ok: false, error: 'ONLYOFFICE_SESSION_INVALID' });
    }
    if (isSessionExpired(session)) {
      return res.status(401).json({ ok: false, error: 'ONLYOFFICE_SESSION_EXPIRED' });
    }

    try {
      const buffer = await downloadDocumentBufferFromConfiguredStorage(session.sourceStorageUrl);
      const ext = String(session.fileFormat || 'pdf').toLowerCase();
      const detectedFormat = detectBufferFileFormat(buffer);

      if (ext === 'docx' && !isDocxBuffer(buffer)) {
        console.error('ONLYOFFICE_FILE_FORMAT_MISMATCH', {
          sessionId: session.id,
          expected: ext,
          detected: detectedFormat,
        });
        return res.status(422).json({
          ok: false,
          error: 'ONLYOFFICE_FILE_FORMAT_MISMATCH',
          message: 'Le fichier source n’est pas un DOCX valide. Relancez l’édition pour régénérer le document.',
          detectedFormat,
        });
      }

      const mime = ext === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === 'odt'
          ? 'application/vnd.oasis.opendocument.text'
          : 'application/pdf';
      const downloadName = ext === 'docx'
        ? `${session.docKey}.docx`
        : ext === 'odt'
          ? `${session.docKey}.odt`
          : `${session.docKey}.pdf`;
      res.setHeader('Content-Type', mime);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      );
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', String(buffer.length));
      return res.send(buffer);
    } catch (error) {
      console.error('ONLYOFFICE_FILE_DOWNLOAD_FAILED', error);
      return res.status(404).json({ ok: false, error: 'ONLYOFFICE_FILE_NOT_FOUND' });
    }
  });

  app.post('/api/onlyoffice/callback/:sessionId', async (req, res) => {
    const session = await getSession(req.params.sessionId);
    if (!session) {
      return callbackOk(res);
    }

    const parsed = parseOnlyOfficeCallbackStatus(req.body || {});
    if (parsed.corrupted) {
      console.error('ONLYOFFICE_CALLBACK_CORRUPTED', { sessionId: session.id, status: parsed.status });
      return callbackOk(res);
    }
    if (parsed.closedWithoutChanges || !parsed.mustSave || !parsed.downloadUrl) {
      return callbackOk(res);
    }

    await markSaving(session.id);

    try {
      const response = await fetch(parsed.downloadUrl);
      if (!response.ok) {
        throw new Error(`ONLYOFFICE_DOWNLOAD_FAILED_${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const sha256 = createHash('sha256').update(buffer).digest('hex');
      const fileFormat = String(session.fileFormat || 'pdf').toLowerCase();
      const mimeType = fileFormat === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : fileFormat === 'odt'
          ? 'application/vnd.oasis.opendocument.text'
          : 'application/pdf';

      const document = await resolveDocumentRecord(listDossierDocuments, session.dossierId, session.docKey);
      const uploadResult = await uploadDocumentToConfiguredStorage({
        dossierId: session.dossierId,
        docKey: session.docKey,
        buffer,
        originalFilename: `${session.docKey}_edited_${Date.now()}.${fileFormat}`,
        mimeType,
      });

      const version = await createVersionFromEditorSave({
        dossierId: session.dossierId,
        docKey: session.docKey,
        document,
        storageUrl: uploadResult.storageUrl,
        sha256,
        fileSizeBytes: buffer.length,
        mimeType,
        fileFormat,
        origin: 'editor_free',
        editorProvider: 'onlyoffice',
        createdBy: session.userId,
        metadata: {
          editorSessionId: session.id,
          onlyofficeKey: parsed.key,
        },
      });

      let previewUpdate = null;
      if (fileFormat === 'docx') {
        previewUpdate = await persistOnlyOfficePdfPreview({
          session,
          document,
          docxStorageUrl: uploadResult.storageUrl,
          createdBy: session.userId,
        }).catch((previewError) => {
          console.warn('ONLYOFFICE_PDF_PREVIEW_UPDATE_FAILED', previewError?.message || previewError);
          return null;
        });
      }

      if (updateDossierDocument && document) {
        const nextStorageUrl = previewUpdate?.uploadResult?.storageUrl
          || (fileFormat === 'pdf' ? uploadResult.storageUrl : document.storageUrl || document.fileUrl);
        const nextMimeType = previewUpdate ? 'application/pdf' : mimeType;
        const nextFilename = previewUpdate
          ? `${session.docKey}.pdf`
          : `${session.docKey}.${fileFormat}`;
        await updateDossierDocument({
          dossierId: session.dossierId,
          docKey: session.docKey,
          status: document.status,
          fileUrl: nextStorageUrl,
          storageUrl: nextStorageUrl,
          filename: nextFilename,
          fileSizeBytes: previewUpdate?.uploadResult?.fileSizeBytes || buffer.length,
          mimeType: nextMimeType,
          sha256: previewUpdate?.sha256 || sha256,
          metadata: {
            ...(document.metadata || {}),
            lastOnlyOfficeSaveAt: new Date().toISOString(),
            lastDocxStorageUrl: fileFormat === 'docx' ? uploadResult.storageUrl : document.metadata?.lastDocxStorageUrl,
            unsigned: true,
          },
        });
      }

      await markSaved(session.id, version?.id || null);
      return callbackOk(res);
    } catch (error) {
      console.error('ONLYOFFICE_CALLBACK_SAVE_FAILED', error);
      return callbackOk(res);
    }
  });

  app.get('/api/dossiers/:dossierId/documents/:docKey/onlyoffice-config', async (req, res) => {
    if (!isOnlyOfficeConfigured()) {
      return res.status(501).json({
        ok: false,
        error: 'ONLYOFFICE_NOT_CONFIGURED',
        message: 'L’éditeur ONLYOFFICE n’est pas configuré sur ce serveur. L’aperçu reste disponible.',
      });
    }

    const sessionId = String(req.query.sessionId || '');
    const accessToken = String(req.query.token || '');
    const session = await getSessionByToken(accessToken);
    if (!session || session.id !== sessionId || session.provider !== 'onlyoffice') {
      return res.status(401).json({ ok: false, error: 'ONLYOFFICE_SESSION_INVALID' });
    }
    if (isSessionExpired(session)) {
      return res.status(401).json({ ok: false, error: 'ONLYOFFICE_SESSION_EXPIRED' });
    }

    const document = await resolveDocumentRecord(listDossierDocuments, session.dossierId, session.docKey);
    if (session.docKey === 'signed_statutes' && !canEditStatutesInOnlyOffice(document)) {
      return res.status(409).json({ ok: false, error: 'STATUTES_SIGNED_LOCKED' });
    }
    if (isDocumentSignedLocked(document) && session.docKey !== 'signed_statutes') {
      return res.status(409).json({ ok: false, error: 'DOCUMENT_SIGNED_IMMUTABLE' });
    }

    const apiBase = String(apiBaseUrl || process.env.GREFFIO_API_URL || '').replace(/\/$/, '');
    const currentVersion = await getCurrentVersion(session.dossierId, session.docKey);
    const fileType = resolveOnlyOfficeFileType(
      session.fileFormat === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : document?.mimeType,
      session.fileFormat || currentVersion?.fileFormat,
    );
    const documentKey = buildOnlyOfficeDocumentKey({
      dossierId: session.dossierId,
      docKey: session.docKey,
      versionId: currentVersion?.id,
      sha256: currentVersion?.sha256 || document?.sha256,
      sessionId: session.id,
    });
    const fileUrl = `${apiBase}/api/onlyoffice/files/${session.id}/download?token=${encodeURIComponent(accessToken)}`;
    const callbackUrl = `${apiBase}/api/onlyoffice/callback/${session.id}`;
    const title = document?.label || session.docKey;

    const config = buildOnlyOfficeEditorConfig({
      documentKey,
      title,
      fileUrl,
      callbackUrl,
      fileType,
      user: { id: session.userId, name: session.userEmail || 'Utilisateur Greffio' },
      mode: 'edit',
    });

    return res.json({
      ok: true,
      provider: 'onlyoffice',
      documentServerUrl: getOnlyOfficeServerUrl(),
      config,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    });
  });
};
