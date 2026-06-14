import { COMPANY_FORM_CATALOG } from '@/config/catalog.js';
import { isEiLikeFormality } from '@/config/formalities.js';
import { resolveDemarchePreset } from '@/utils/formalityMapping.js';

export const QUESTIONNAIRE_FORM_FAMILY_AUTRES = '__AUTRES__';

export const QUESTIONNAIRE_PRIMARY_FORM_FAMILIES = Object.freeze([
  'Formes les plus courantes',
  'Entrepreneurs individuels',
  'Sociétés commerciales classiques',
  'Sociétés civiles et immobilières',
  'Professions libérales et santé',
]);

export const QUESTIONNAIRE_SECONDARY_FORM_FAMILIES = Object.freeze([
  'Coopératives et économie sociale',
  'Groupes, investissements et montages',
  'Agricole',
  'Public, mixte et réglementé',
  'Situations atypiques',
]);

export const COMMERCIAL_FORM_FAMILIES = new Set([
  'Formes les plus courantes',
  'Sociétés commerciales classiques',
]);

export const QUESTIONNAIRE_FORM_FAMILY_GROUPS = COMPANY_FORM_CATALOG.reduce((groups, entry) => {
  const existing = groups.find((group) => group.category === entry.family);
  if (existing) {
    existing.forms.push(entry);
    return groups;
  }
  return [...groups, { category: entry.family, forms: [entry] }];
}, []);

export const getCatalogFormsForFamily = (family = '') => {
  const normalized = String(family || '').trim();
  if (!normalized) return [];
  return COMPANY_FORM_CATALOG
    .filter((entry) => entry.family === normalized)
    .sort((left, right) => (left.rank || 99) - (right.rank || 99));
};

export const getFormCountForFamily = (family = '') => {
  const normalized = String(family || '').trim();
  if (!normalized || normalized === QUESTIONNAIRE_FORM_FAMILY_AUTRES) {
    return QUESTIONNAIRE_SECONDARY_FORM_FAMILIES.reduce(
      (total, category) => total + getCatalogFormsForFamily(category).length,
      0,
    );
  }
  return getCatalogFormsForFamily(normalized).length;
};

export const isQuestionnaireAutresPrimary = (primary = '') => (
  String(primary || '').trim() === QUESTIONNAIRE_FORM_FAMILY_AUTRES
);

export const resolvePrimaryFromFamille = (famille = '') => {
  const normalized = String(famille || '').trim();
  if (!normalized) return '';
  if (QUESTIONNAIRE_PRIMARY_FORM_FAMILIES.includes(normalized)) return normalized;
  if (QUESTIONNAIRE_SECONDARY_FORM_FAMILIES.includes(normalized)) return QUESTIONNAIRE_FORM_FAMILY_AUTRES;
  return '';
};

export const normalizeQuestionnaireFormFamilyFields = (data = {}) => {
  const primary = String(data.formeJuridiqueFamillePrimary || '').trim();
  if (primary) return data;

  const famille = String(data.formeJuridiqueFamille || '').trim();
  if (!famille) {
    return { ...data, formeJuridiqueFamillePrimary: '', formeJuridiqueFamilleSecondary: '' };
  }

  const inferredPrimary = resolvePrimaryFromFamille(famille);
  return {
    ...data,
    formeJuridiqueFamillePrimary: inferredPrimary,
    formeJuridiqueFamilleSecondary: inferredPrimary === QUESTIONNAIRE_FORM_FAMILY_AUTRES ? famille : '',
  };
};

export const needsFormeWizard = (data = {}) => {
  const typeFormalite = String(data.typeFormalite || '').trim();
  if (!typeFormalite || isEiLikeFormality(data)) return false;
  const preset = resolveDemarchePreset(typeFormalite);
  if (preset.formeJuridique) return false;
  return typeFormalite === 'creation_societe';
};

export const isCommercialFormFamily = (family = '') => (
  COMMERCIAL_FORM_FAMILIES.has(String(family || '').trim())
);

export const mapCatalogFormToFormeJuridique = (form) => {
  const label = String(form?.label || '').trim();
  const upper = label.toUpperCase();
  if (['SASU', 'SAS', 'SARL', 'EURL', 'SCI', 'SA'].includes(upper)) return upper;
  if (upper.includes('MICRO') || upper.includes('AUTO-ENTREPRENEUR')) return 'MICRO-ENTREPRISE';
  if (upper.includes('ENTREPRISE INDIVIDUELLE') || upper === 'EI') return 'EI';
  return label || 'AUTRE';
};

export const getFormeJuridiqueOptionsForFamily = (family = '') => {
  const forms = getCatalogFormsForFamily(family);
  const values = forms.map(mapCatalogFormToFormeJuridique);
  return [...new Set(values.filter(Boolean))];
};

export const shouldShowFormeJuridiqueField = (data = {}) => {
  if (!needsFormeWizard(data)) return false;
  if (data.comparateurIgnore) return false;
  const family = String(data.formeJuridiqueFamille || '').trim();
  if (!family) return false;
  if (isCommercialFormFamily(family)) {
    return String(data.connaissezFormeJuridique || '') === 'oui';
  }
  return true;
};

export const shouldShowComparateurCta = (data = {}) => {
  if (!needsFormeWizard(data) || data.comparateurIgnore) return false;
  const family = String(data.formeJuridiqueFamille || '').trim();
  return isCommercialFormFamily(family) && String(data.connaissezFormeJuridique || '') === 'non';
};
