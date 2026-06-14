import { getEditableDocumentConfig } from '../documents/editableDocumentRegistry.js';
import { generateNonConvictionPdf } from '../pdf/nonConvictionPdf.js';

export const regenerateCleanSigningPdf = async ({
  request,
  appUrl = null,
}) => {
  const docKey = String(request?.docKey || '');
  const fields = request?.fields && typeof request.fields === 'object' ? request.fields : {};
  const args = {
    filename: `clean_signing_${request.id}_${Date.now()}.pdf`,
    fields,
    documentId: request.documentId || request.evidence?.documentId || null,
    verifyToken: request.evidence?.verifyToken || null,
    appUrl,
    isDraft: false,
  };

  const editableConfig = getEditableDocumentConfig(docKey);
  if (editableConfig) {
    return editableConfig.generatePdf(args);
  }
  if (docKey === 'manager_non_conviction') {
    return generateNonConvictionPdf(args);
  }
  return null;
};
