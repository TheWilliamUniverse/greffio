import { resolveLegalEntitySignatoryQuality } from '../shared/partyIdentityFormatter.js';

const isPresidentRole = (roleLabel = '') => /président/i.test(String(roleLabel));

const isDirectorGeneralRole = (roleLabel = '') => /directeur\s+général/i.test(String(roleLabel));

const buildCompanyLabel = (associate = {}) => {
  const company = String(associate.companyName || associate.label || '').trim();
  const rep = String(associate.representativeName || '').trim();
  const quality = resolveLegalEntitySignatoryQuality({
    representativeQuality: associate.representativeQuality,
  });
  if (rep && quality) return `${company}, représentée par ${rep}, en qualité de ${quality}`;
  if (rep) return `${company}, représentée par ${rep}`;
  return company;
};

const buildPersonLabel = (associate = {}) => {
  const label = String(associate.label || '').trim();
  if (label) return label;
  return [associate.firstName, associate.lastName].filter(Boolean).join(' ').trim();
};

export const formatAssociateOfficerLabel = (associate = {}) => {
  if (associate.associateType === 'personne_morale') {
    return buildCompanyLabel(associate);
  }
  return buildPersonLabel(associate);
};

export const resolveOfficersFromAssociates = (associates = [], { fallbackPresident = '', fallbackDirectorGeneral = 'Aucun' } = {}) => {
  const list = Array.isArray(associates) ? associates : [];
  const presidentAssoc = list.find((a) => isPresidentRole(a.roleLabel));
  const dgAssoc = list.find((a) => isDirectorGeneralRole(a.roleLabel));

  return {
    president: presidentAssoc ? formatAssociateOfficerLabel(presidentAssoc) : fallbackPresident,
    directeurGeneral: dgAssoc ? formatAssociateOfficerLabel(dgAssoc) : fallbackDirectorGeneral,
  };
};
