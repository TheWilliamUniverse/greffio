import { getEditableDocumentConfig } from '../../documents/editableDocumentRegistry.js';
import { NON_CONVICTION_DOC_KEY } from '../nonConvictionDocumentService.js';

/**
 * Résout le template email « document signé » selon docKey (non-conviction,
 * procuration/pouvoirs, liste souscripteurs, etc.).
 */
export const resolveSignatureCompletedEmail = ({ docKey, dossier, signerFullName, appUrl }) => {
  const firstName = String(signerFullName || 'Client').split(' ')[0] || 'Client';
  const companyName = dossier?.companyName || dossier?.denomination || 'Votre société';
  const signedDownloadLink = `${appUrl}/documents`;
  const editableConfig = getEditableDocumentConfig(docKey);

  if (editableConfig?.emailTemplateDone) {
    return {
      templateKey: editableConfig.emailTemplateDone,
      variables: {
        firstName,
        companyName,
        signedDownloadLink,
        documentTitle: editableConfig.publicDocumentTitle || editableConfig.title || docKey,
      },
    };
  }

  if (docKey === NON_CONVICTION_DOC_KEY) {
    return {
      templateKey: 'non_conviction_signature_completed',
      variables: { firstName, companyName, signedDownloadLink },
    };
  }

  return {
    templateKey: 'editable_document_signature_completed',
    variables: {
      firstName,
      companyName,
      signedDownloadLink,
      documentTitle: docKey,
    },
  };
};
