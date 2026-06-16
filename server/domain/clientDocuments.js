/** Pièces retirées de la checklist client (doublon ou fusion dans un autre doc). */
export const REDUNDANT_CLIENT_DOC_KEYS = Object.freeze(['filiation_declaration']);

export const filterClientVisibleDocuments = (documents = []) => (
  documents.filter((doc) => !REDUNDANT_CLIENT_DOC_KEYS.includes(doc.docKey))
);
