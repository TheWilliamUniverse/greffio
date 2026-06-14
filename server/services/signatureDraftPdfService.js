import fs from 'node:fs';
import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
import {
  NON_CONVICTION_DOC_KEY,
  persistNonConvictionPdfForDossier,
} from './nonConvictionDocumentService.js';
import {
  PROXY_MANDATE_DOC_KEY,
  generateMandateDraftPdf,
} from './mandateSignatureService.js';
import { persistEditableDocumentPdf } from './editableDocumentService.js';

/**
 * Garantit un PDF brouillon disponible pour une demande de signature.
 * Régénère depuis fields_json si le fichier local a été purgé (redémarrage PM2, autre nœud).
 */
export const ensureSignatureDraftPdf = async ({
  request,
  getDossier,
  ensureDossierDocuments,
  updateDossierDocument,
  listDossierDocuments,
  DOCUMENT_STATUSES,
}) => {
  if (request?.draftPdfPath && fs.existsSync(request.draftPdfPath)) {
    return request.draftPdfPath;
  }

  const dossier = await getDossier(request.dossierId);
  if (!dossier) {
    const error = new Error('DOSSIER_NOT_FOUND');
    error.code = 'DOSSIER_NOT_FOUND';
    throw error;
  }

  const fields = request.fields || {};
  const editableConfig = getEditableDocumentConfig(request.docKey);

  if (editableConfig) {
    const result = await persistEditableDocumentPdf({
      docKey: editableConfig.docKey,
      schemaVersion: editableConfig.schemaVersion,
      dossier,
      fields,
      generatePdf: editableConfig.generatePdf,
      filenamePrefix: editableConfig.filenamePrefix,
      ensureDossierDocuments,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra: {
        declarationStatus: 'preview_ready',
        signatureRequestId: request.id,
        regeneratedDraft: true,
      },
    });
    return result.pdfPath;
  }

  if (request.docKey === PROXY_MANDATE_DOC_KEY) {
    const signerFullName = request.signerFullName
      || request.fields?.signerFullName
      || dossier.companyName
      || 'Client Greffio';
    const { pdfPath } = await generateMandateDraftPdf({
      dossier,
      signerFullName,
      documentId: request.documentId || null,
      verifyToken: request.evidence?.verifyToken || null,
      appUrl: process.env.GREFFIO_APP_URL || process.env.APP_URL,
    });
    return pdfPath;
  }

  if (request.docKey === NON_CONVICTION_DOC_KEY) {
    const result = await persistNonConvictionPdfForDossier({
      dossier,
      fields,
      ensureDossierDocuments,
      updateDossierDocument,
      listDossierDocuments,
      DOCUMENT_STATUSES,
      metadataExtra: {
        declarationStatus: 'preview_ready',
        signatureRequestId: request.id,
        regeneratedDraft: true,
      },
    });
    return result.pdfPath;
  }

  const error = new Error('SIGNATURE_PDF_NOT_FOUND');
  error.code = 'SIGNATURE_PDF_NOT_FOUND';
  throw error;
};
