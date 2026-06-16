import { downloadDossierDocument } from '@/api/documents.js';
import { savePdfBlobToDevice } from '@/utils/dossierDocumentFile.js';

/** Télécharge un PDF signé (web anchor ou export natif Capacitor). */
export const downloadSignedDocument = async ({
  blob = null,
  filename = 'document-signe.pdf',
  dossierId = '',
  docKey = '',
} = {}) => {
  let pdfBlob = blob;
  if (!pdfBlob && dossierId && docKey) {
    ({ blob: pdfBlob } = await downloadDossierDocument({
      dossierId,
      docKey,
      cacheBust: true,
      inline: true,
    }));
  }
  if (!pdfBlob) throw new Error('DOCUMENT_DOWNLOAD_FAILED');
  await savePdfBlobToDevice(pdfBlob, filename);
};
