const normalizeToken = (value, fallback) => {
  const cleaned = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return cleaned || fallback;
};

const DOC_KEY_FILENAME_PREFIX = Object.freeze({
  identity_proof: 'Piece_identite',
  address_proof: 'Justificatif_domicile',
  proxy_mandate: 'Procuration_Greffio',
  signed_statutes: 'Statuts_signes',
  capital_certificate: 'Attestation_depot_capital',
  legal_notice_certificate: 'Attestation_annonce_legale',
  registered_office_proof: 'Justificatif_siege_social',
  ubo_declaration: 'Declaration_beneficiaires_effectifs',
  manager_non_conviction: 'Declaration_non_condamnation',
  subscribers_list: 'Liste_souscripteurs',
  formality_powers: 'Procuration_pouvoirs_formalites',
  filiation_declaration: 'Declaration_filiation',
  minor_emancipation_order: 'Ordonnance_emancipation',
  minor_parental_authorization: 'Autorisation_parentale_mineur',
});

const buildCanonicalDocumentFilename = ({
  docKey,
  dossierCompanyName,
  ownerFirstName,
  ownerLastName,
}) => {
  const prefix = DOC_KEY_FILENAME_PREFIX[docKey] || normalizeToken(docKey, 'DOCUMENT');
  const normalizedFirstName = normalizeToken(ownerFirstName, 'PRENOM');
  const normalizedLastName = normalizeToken(ownerLastName, 'NOM');
  const normalizedCompany = normalizeToken(dossierCompanyName, 'DENOMINATION');

  if (docKey === 'identity_proof' || docKey === 'address_proof' || docKey === 'proxy_mandate') {
    return `${prefix}_${normalizedLastName}_${normalizedFirstName}.pdf`;
  }

  if (
    docKey === 'signed_statutes'
    || docKey === 'capital_certificate'
    || docKey === 'legal_notice_certificate'
    || docKey === 'registered_office_proof'
    || docKey === 'ubo_declaration'
    || docKey === 'manager_non_conviction'
    || docKey === 'subscribers_list'
    || docKey === 'formality_powers'
    || docKey === 'filiation_declaration'
  ) {
    return `${prefix}_${normalizedCompany}.pdf`;
  }

  return `${prefix}_${normalizedCompany}.pdf`;
};

export { buildCanonicalDocumentFilename };
