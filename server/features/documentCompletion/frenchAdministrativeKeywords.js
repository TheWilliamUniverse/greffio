export const FRENCH_ADMINISTRATIVE_FIELD_KEYWORDS = [
  { normalizedKey: 'last_name', type: 'text', category: 'identity', labels: ['nom', 'nom de naissance', "nom d'usage", 'nom du demandeur'], confidenceBoost: 0.15 },
  { normalizedKey: 'first_name', type: 'text', category: 'identity', labels: ['prénom', 'prénoms', 'premier prénom'], confidenceBoost: 0.15 },
  { normalizedKey: 'birth_date', type: 'date', category: 'identity', labels: ['date de naissance', 'né le', 'née le'], confidenceBoost: 0.18 },
  { normalizedKey: 'birth_place', type: 'text', category: 'identity', labels: ['lieu de naissance', 'commune de naissance', 'né à', 'née à'], confidenceBoost: 0.15 },
  { normalizedKey: 'legal_name', type: 'legal_name', category: 'company', labels: ['dénomination', 'dénomination sociale', 'raison sociale', 'nom commercial'], confidenceBoost: 0.2 },
  { normalizedKey: 'legal_form', type: 'legal_form', category: 'company', labels: ['forme juridique', 'statut juridique'], confidenceBoost: 0.18 },
  { normalizedKey: 'share_capital', type: 'currency', category: 'company', labels: ['capital social', 'montant du capital', 'capital'], confidenceBoost: 0.16 },
  { normalizedKey: 'share_count_actions', type: 'number', category: 'company', labels: ['nombre d\'actions', "nombre d actions", 'actions souscrites', 'souscription d\'actions', 'cession d\'actions'], confidenceBoost: 0.2, securitiesType: 'actions' },
  { normalizedKey: 'share_count_parts', type: 'number', category: 'company', labels: ['nombre de parts sociales', 'parts sociales souscrites', 'souscription de parts sociales', 'cession de parts sociales', 'parts sociales'], confidenceBoost: 0.2, securitiesType: 'parts_sociales' },
  { normalizedKey: 'siren', type: 'siren', category: 'registry', labels: ['siren', 'numéro siren'], confidenceBoost: 0.25 },
  { normalizedKey: 'siret', type: 'siret', category: 'registry', labels: ['siret', 'numéro siret'], confidenceBoost: 0.25 },
  { normalizedKey: 'rcs_city', type: 'rcs_city', category: 'registry', labels: ['rcs', 'immatriculé au rcs de', 'greffe de'], confidenceBoost: 0.18 },
  { normalizedKey: 'ape_code', type: 'ape_code', category: 'registry', labels: ['code ape', 'code naf', 'activité principale exercée'], confidenceBoost: 0.18 },
  { normalizedKey: 'registered_office', type: 'address', category: 'address', labels: ['siège social', 'adresse du siège', "adresse de l'établissement", 'domicile'], confidenceBoost: 0.18 },
  { normalizedKey: 'email', type: 'email', category: 'contact', labels: ['email', 'e-mail', 'courriel', 'adresse électronique'], confidenceBoost: 0.2 },
  { normalizedKey: 'phone', type: 'phone', category: 'contact', labels: ['téléphone', 'portable', 'numéro de téléphone'], confidenceBoost: 0.16 },
  { normalizedKey: 'signature', type: 'signature', category: 'signature', labels: ['signature', 'signature du demandeur', 'signature du représentant légal', 'cachet et signature'], confidenceBoost: 0.25 },
  { normalizedKey: 'postal_code', type: 'postal_code', category: 'address', labels: ['code postal', 'cp'], confidenceBoost: 0.18 },
  { normalizedKey: 'city', type: 'city', category: 'address', labels: ['ville', 'commune'], confidenceBoost: 0.14 },
  { normalizedKey: 'country', type: 'country', category: 'address', labels: ['pays', 'nationalité'], confidenceBoost: 0.12 },
  { normalizedKey: 'iban', type: 'iban', category: 'banking', labels: ['iban', 'compte bancaire'], confidenceBoost: 0.2 },
  { normalizedKey: 'fait_a', type: 'city', category: 'date', labels: ['fait à', 'fait a'], confidenceBoost: 0.14 },
  { normalizedKey: 'date_document', type: 'date', category: 'date', labels: ['le', 'date'], confidenceBoost: 0.1 },
];

export const normalizeFrenchLabel = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export const matchAdministrativeKeyword = (text) => {
  const normalized = normalizeFrenchLabel(text);
  if (!normalized) return null;
  for (const entry of FRENCH_ADMINISTRATIVE_FIELD_KEYWORDS) {
    const hit = entry.labels.find((label) => normalized.includes(normalizeFrenchLabel(label)));
    if (hit) return { ...entry, matchedLabel: hit };
  }
  return null;
};
