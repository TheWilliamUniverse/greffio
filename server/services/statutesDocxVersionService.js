import { createHash } from 'node:crypto';
import { documentToPreview } from '../legal/statutes/index.js';
import { mapStatutesData } from '../utils/statutesDataMapper.js';
import { draftStatutesDocument } from './statutesDrafting.js';
import { buildStatutesDocxBuffer } from '../statuts/shared/statutesOfficeExportCore.js';
import { assertDocxBuffer, detectBufferFileFormat, isDocxBuffer } from '../utils/fileFormatDetection.js';
import { downloadDocumentBufferFromConfiguredStorage, uploadDocumentToConfiguredStorage } from './objectStorage.js';
import {
  createVersion,
  getCurrentPdfVersion,
  getCurrentVersion,
  syncDocumentVersionPointers,
} from './documentVersionService.js';
import { getStatutesWorkflowStatus } from '../domain/statutesWorkflow.js';

const buildStatutesPreviewForDossier = ({ dossier, questionnaire, user }) => {
  const statutesData = mapStatutesData({ dossier, questionnaire, user });
  const statutesDocument = draftStatutesDocument(statutesData);
  return documentToPreview(statutesDocument);
};

export const bootstrapDocumentVersionFromRecord = async ({
  dossierId,
  docKey,
  document,
  createdBy = null,
}) => {
  if (!document) return null;
  const storageUrl = document.storageUrl || document.fileUrl;
  if (!storageUrl) return null;

  const existing = await getCurrentVersion(dossierId, docKey);
  if (existing) return existing;

  const mimeType = String(document.mimeType || '').toLowerCase();
  const filename = String(document.filename || document.originalFilename || '');
  let isPdf = mimeType.includes('pdf') || /\.pdf$/i.test(filename);

  if (!isPdf && storageUrl) {
    try {
      const probeBuffer = await downloadDocumentBufferFromConfiguredStorage(storageUrl);
      const detected = detectBufferFileFormat(probeBuffer);
      if (detected === 'pdf') isPdf = true;
      else if (detected === 'docx') isPdf = false;
    } catch (probeError) {
      console.warn('[statutes-docx] bootstrap format probe failed', {
        dossierId,
        docKey,
        message: probeError?.message,
      });
    }
  }

  const version = await createVersion({
    dossierId,
    docKey,
    documentId: document.id || null,
    origin: 'bootstrap',
    status: docKey === 'signed_statutes' ? getStatutesWorkflowStatus(document) : 'draft',
    fileFormat: isPdf ? 'pdf' : 'docx',
    mimeType: document.mimeType || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    storageUrl,
    fileSizeBytes: document.fileSizeBytes || null,
    sha256: document.sha256 || null,
    metadata: document.metadata || {},
    createdBy,
    markCurrent: true,
  });

  await syncDocumentVersionPointers({
    dossierId,
    docKey,
    versionId: version.id,
    pdfVersionId: isPdf ? version.id : null,
  });

  return version;
};

const isStoredDocxVersionValid = async (version) => {
  if (!version?.storageUrl || version.fileFormat !== 'docx') return false;
  try {
    const buffer = await downloadDocumentBufferFromConfiguredStorage(version.storageUrl);
    return isDocxBuffer(buffer);
  } catch (error) {
    console.warn('[statutes-docx] stored docx validation failed', {
      versionId: version?.id,
      message: error?.message,
    });
    return false;
  }
};

export const ensureStatutesDocxEditVersion = async ({
  dossierId,
  document,
  dossier,
  questionnaire,
  user = null,
  createdBy = null,
}) => {
  await bootstrapDocumentVersionFromRecord({
    dossierId,
    docKey: 'signed_statutes',
    document,
    createdBy,
  });

  let currentVersion = await getCurrentVersion(dossierId, 'signed_statutes');
  if (currentVersion?.fileFormat === 'docx' && await isStoredDocxVersionValid(currentVersion)) {
    return currentVersion;
  }
  if (currentVersion?.fileFormat === 'docx') {
    console.warn('[statutes-docx] current version labeled docx but invalid content, regenerating', {
      dossierId,
      versionId: currentVersion.id,
    });
  }

  const pdfVersion = currentVersion?.fileFormat === 'pdf'
    ? currentVersion
    : await getCurrentPdfVersion(dossierId, 'signed_statutes');

  const preview = buildStatutesPreviewForDossier({ dossier, questionnaire, user });
  const buffer = assertDocxBuffer(buildStatutesDocxBuffer(preview));
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const safeReference = String(dossier?.reference || dossierId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Statuts_${safeReference}_${Date.now()}.docx`;

  const uploadResult = await uploadDocumentToConfiguredStorage({
    dossierId,
    docKey: 'signed_statutes',
    buffer,
    originalFilename: filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const docxVersion = await createVersion({
    dossierId,
    docKey: 'signed_statutes',
    documentId: document?.id || null,
    origin: 'office_export',
    status: getStatutesWorkflowStatus(document),
    fileFormat: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    storageUrl: uploadResult.storageUrl,
    storageKey: uploadResult.storageKey || null,
    fileSizeBytes: buffer.length,
    sha256,
    contentHash: sha256,
    pdfVersionId: pdfVersion?.id || null,
    sourceVersionId: pdfVersion?.id || null,
    metadata: {
      generatedBy: 'greffio_statutes_office_export',
      source: 'questionnaire_preview',
    },
    createdBy,
    markCurrent: true,
  });

  await syncDocumentVersionPointers({
    dossierId,
    docKey: 'signed_statutes',
    versionId: docxVersion.id,
    pdfVersionId: pdfVersion?.id || null,
  });

  return docxVersion;
};
