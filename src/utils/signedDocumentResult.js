/** Construit l'état UI après signature immédiate (éditeurs de documents). */
export const buildSignedDocumentResult = ({
  apiResult = {},
  signaturePayload = {},
  documentLabel = 'Document',
  previewBlobUrl = '',
  previewBlob = null,
  previewFilename = 'document-signe.pdf',
}) => ({
  documentLabel,
  signerName: signaturePayload.signerFullName || signaturePayload.signatureFullName || '',
  signedAt: apiResult.signedAt || new Date().toISOString(),
  proofId: apiResult.proofId || '',
  verifyUrl: apiResult.verifyUrl || '',
  previewBlobUrl,
  previewBlob,
  previewFilename,
});
