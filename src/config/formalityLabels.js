/** Libellés publics des formalités (UI client) – alignés sur server/domain/formalityLabels.js */

export const TYPE_FORMALITE_PUBLIC_LABELS = Object.freeze({
  creation_societe: 'Formalité de création de société',
  creation_sasu: 'Formalité de création de SASU',
  creation_sas: 'Formalité de création de SAS',
  creation_sarl: 'Formalité de création de SARL',
  creation_eurl: 'Formalité de création d\'EURL',
  creation_sci: 'Formalité de création de SCI',
  micro_entreprise: 'Formalité de création de micro-entreprise',
  entreprise_individuelle: 'Formalité de création d\'entreprise individuelle',
  societe_etrangere_france: 'Formalité d\'immatriculation d\'une société étrangère en France',
  etablissement_secondaire_creation: 'Formalité de création d\'établissement secondaire',
  etablissement_creation: 'Formalité d\'ajout d\'établissement',
  etablissement_fermeture: 'Formalité de fermeture d\'établissement',
  etablissement_transfert: 'Formalité de transfert d\'établissement',
  transfert_siege: 'Formalité de transfert de siège social',
  changement_dirigeant: 'Formalité de changement de dirigeant',
  changement_denomination: 'Formalité de changement de dénomination sociale',
  modification_activite: 'Formalité de modification d\'activité',
  modification_objet_social: 'Formalité de modification de l\'objet social',
  augmentation_capital: 'Formalité d\'augmentation de capital social',
  reduction_capital: 'Formalité de réduction de capital social',
  beneficiaires_effectifs_modification: 'Formalité de modification des bénéficiaires effectifs',
  depot_comptes_annuels: 'Formalité de dépôt des comptes annuels',
  mise_en_sommeil: 'Formalité de mise en sommeil de la société',
  reprise_activite: 'Formalité de reprise d\'activité',
  dissolution_liquidation_radiation: 'Formalité de dissolution, liquidation ou radiation',
  correction_regularisation: 'Formalité de régularisation',
  obtention_kbis_documents: 'Formalité d\'obtention de Kbis ou documents officiels',
  modification_entreprise: 'Formalité de modification d\'entreprise',
});

export const SERVICE_PUBLIC_LABELS = Object.freeze({
  'creation-sasu': 'Formalité de création de SASU',
  'creation-sas': 'Formalité de création de SAS',
  'creation-sarl': 'Formalité de création de SARL',
  'creation-eurl': 'Formalité de création d\'EURL',
  'creation-sci': 'Formalité de création de SCI',
  'creation-sa': 'Formalité de création de SA',
  'creation-ei': 'Formalité de création d\'entreprise individuelle',
  'micro-entreprise': 'Formalité de création de micro-entreprise',
  'creation-etablissement-secondaire': 'Formalité de création d\'établissement secondaire',
  'transfert-siege': 'Formalité de transfert de siège social',
  'dissolution-liquidation-radiation': 'Formalité de dissolution, liquidation ou radiation',
  'dissolution-liquidation': 'Formalité de dissolution et liquidation',
  'fermeture-entreprise': 'Formalité de fermeture d\'entreprise',
  'depot-comptes-annuels': 'Formalité de dépôt des comptes annuels',
  modification: 'Formalité de modification d\'entreprise',
  'changement-dirigeant': 'Formalité de changement de dirigeant',
  formalite: 'Formalité Greffio',
});

const looksLikeSlug = (value = '') => /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(String(value).trim());

export const resolveFormalityPublicLabel = ({
  service,
  typeFormalite,
  formeJuridique,
  legalForm,
} = {}) => {
  const typeKey = String(typeFormalite || '').trim();
  if (typeKey && Object.prototype.hasOwnProperty.call(TYPE_FORMALITE_PUBLIC_LABELS, typeKey)) {
    const mapped = TYPE_FORMALITE_PUBLIC_LABELS[typeKey];
    if (mapped) return mapped;
    const form = String(formeJuridique || legalForm || '').trim();
    if (form) return `Formalité de création de ${form}`;
    return 'Formalité de création de société';
  }

  const serviceKey = String(service || '').trim();
  if (serviceKey && SERVICE_PUBLIC_LABELS[serviceKey]) {
    return SERVICE_PUBLIC_LABELS[serviceKey];
  }

  const form = String(formeJuridique || legalForm || '').trim();
  if (form && (serviceKey.startsWith('creation') || typeKey.includes('creation'))) {
    return `Formalité de création de ${form}`;
  }

  if (serviceKey && looksLikeSlug(serviceKey)) {
    const humanized = serviceKey.replace(/-/g, ' ');
    return `Formalité de ${humanized}`;
  }

  if (typeKey && !looksLikeSlug(typeKey)) return typeKey;

  return 'Formalité Greffio';
};
