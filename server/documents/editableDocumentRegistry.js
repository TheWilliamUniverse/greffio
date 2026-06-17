import { generateSubscribersListPdf, validateSubscribersListFields } from '../pdf/subscribersListPdf.js';
import { generateFormalityPowersPdf, validateFormalityPowersFields } from '../pdf/formalityPowersPdf.js';
import { buildSubscribersListFields } from '../documents/subscribersList/buildFields.js';
import { buildFormalityPowersFields } from '../documents/formalityPowers/buildFields.js';

export const EDITABLE_DOCUMENT_REGISTRY = Object.freeze({
  subscribers_list: {
    docKey: 'subscribers_list',
    schemaVersion: 'subscribers_list_v1',
    title: 'Liste des souscripteurs',
    filenamePrefix: 'Liste_souscripteurs',
    buildInitialFields: buildSubscribersListFields,
    validateFields: validateSubscribersListFields,
    generatePdf: generateSubscribersListPdf,
    signatureLayout: 'subscribers_list_official',
    emailTemplateSend: 'subscribers_list_signature_request',
    emailTemplateDone: 'subscribers_list_signature_completed',
    publicDocumentTitle: 'Liste des souscripteurs',
  },
  formality_powers: {
    docKey: 'formality_powers',
    schemaVersion: 'formality_powers_v1',
    title: 'Procuration et pouvoirs pour formalités',
    filenamePrefix: 'Procuration_pouvoirs_formalites',
    buildInitialFields: buildFormalityPowersFields,
    validateFields: validateFormalityPowersFields,
    generatePdf: generateFormalityPowersPdf,
    signatureLayout: 'formality_powers_official',
    emailTemplateSend: 'formality_powers_signature_request',
    emailTemplateDone: 'formality_powers_signature_completed',
    publicDocumentTitle: 'Procuration et pouvoirs pour formalités',
  },
  signed_statutes: {
    docKey: 'signed_statutes',
    schemaVersion: 'signed_statutes_v1',
    title: 'Statuts de la société',
    filenamePrefix: 'Statuts',
    freeEditOnly: true,
    signatureLayout: null,
    publicDocumentTitle: 'Statuts de la société',
  },
});

export const getEditableDocumentConfig = (docKey) => (
  EDITABLE_DOCUMENT_REGISTRY[String(docKey || '')] || null
);

export const isEditableDocumentKey = (docKey) => Boolean(getEditableDocumentConfig(docKey));

export const getSupportedEditableDocumentKeys = () => Object.keys(EDITABLE_DOCUMENT_REGISTRY);
