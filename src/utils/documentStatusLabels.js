const DOCUMENT_STATUS_LABELS = Object.freeze({
  REQUESTED: 'À fournir',
  UPLOADED: 'Déposé',
  PENDING_REVIEW: 'En vérification',
  VALIDATED: 'Validé',
  VALID: 'Validé',
  REJECTED: 'Refusé',
  INVALID: 'À corriger',
  SIGNED: 'Signé',
  GENERATED: 'Généré',
  A_SIGNER: 'À signer',
  STATUTES_CLIENT_REVIEW: 'Revue client',
  STATUTES_OPS_REVIEW: 'Validation Greffio',
});

export const getDocumentStatusLabel = (status) => {
  const normalized = String(status || '').trim().toUpperCase().replace(/\s+/g, '_');
  return DOCUMENT_STATUS_LABELS[normalized] || 'En cours';
};

export const getDocumentTypeLabel = (docKey, fallbackLabel = '') => {
  const key = String(docKey || '').trim();
  const labels = {
    identity_proof: "Pièce d'identité",
    address_proof: 'Justificatif de domicile',
    proxy_mandate: 'Procuration signée',
    legal_notice_certificate: 'Attestation annonce légale',
    registered_office_proof: 'Justificatif siège social',
    ubo_declaration: 'Déclaration bénéficiaires effectifs',
    manager_non_conviction: 'Déclaration non-condamnation et filiation',
    subscribers_list: 'Liste des souscripteurs',
    formality_powers: 'Procuration et pouvoirs pour formalités',
    regulated_activity_proof: 'Autorisation activité réglementée',
    minor_emancipation_order: "Ordonnance ou jugement d'émancipation",
    minor_parental_authorization: 'Autorisation parentale / tuteur (associé mineur)',
    signed_statutes: 'Statuts signés',
    capital_certificate: 'Attestation dépôt capital',
  };
  return labels[key] || fallbackLabel || 'Document';
};
