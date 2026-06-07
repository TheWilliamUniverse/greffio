import { ASSOCIATE_TYPES, buildAssociateDisplayName } from '@/utils/associateEntry.js';

export const ASSOCIATE_ROLE_OPTIONS = Object.freeze({
  PERSON: ['Associé', 'Associée', 'Président désigné', 'Directeur Général'],
  COMPANY: ['Associé', 'Associée', 'Président désigné', 'Directeur Général'],
});

export const LEGAL_ENTITY_SIGNATORY_QUALITIES = Object.freeze(['Président', 'Directeur Général']);

export const resolveLegalEntitySignatoryQuality = ({ representativeQuality = '' } = {}) => {
  const quality = String(representativeQuality || '').trim();
  return LEGAL_ENTITY_SIGNATORY_QUALITIES.includes(quality) ? quality : '';
};

export const isPresidentRole = (roleLabel = '') => /président/i.test(String(roleLabel));

export const isDirectorGeneralRole = (roleLabel = '') => /directeur\s+général/i.test(String(roleLabel));

export const isOfficerRole = (roleLabel = '') => isPresidentRole(roleLabel) || isDirectorGeneralRole(roleLabel);

export const formatAssociateOfficerLabel = (associate = {}) => {
  if (associate.associateType === ASSOCIATE_TYPES.COMPANY) {
    const company = buildAssociateDisplayName(associate) || 'Société associée';
    const rep = String(associate.representativeName || '').trim();
    if (rep) {
      return `${company}, représentée par ${rep}`;
    }
    return company;
  }
  return buildAssociateDisplayName(associate) || associate.label || '';
};

export const resolveOfficersFromAssociates = (associates = [], { fallbackPresident = '', fallbackDirectorGeneral = '' } = {}) => {
  const list = Array.isArray(associates) ? associates : [];
  const presidentAssoc = list.find((a) => isPresidentRole(a.roleLabel));
  const dgAssoc = list.find((a) => isDirectorGeneralRole(a.roleLabel));

  return {
    president: presidentAssoc ? formatAssociateOfficerLabel(presidentAssoc) : fallbackPresident,
    directorGeneral: dgAssoc ? formatAssociateOfficerLabel(dgAssoc) : fallbackDirectorGeneral,
    presidentIsLegalEntity: presidentAssoc?.associateType === ASSOCIATE_TYPES.COMPANY,
    directorGeneralIsLegalEntity: dgAssoc?.associateType === ASSOCIATE_TYPES.COMPANY,
  };
};

export const syncDirigeantFromAssociates = (associates = [], currentDirigeant = '') => {
  const { president } = resolveOfficersFromAssociates(associates, { fallbackPresident: currentDirigeant });
  const presidentAssoc = (Array.isArray(associates) ? associates : []).find((a) => isPresidentRole(a.roleLabel));
  if (presidentAssoc) return president;
  return currentDirigeant;
};
