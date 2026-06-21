import { LEGAL_ENTITY_SIGNATORY_QUALITIES } from '@/utils/officerFromAssociates.js';

export const ASSOCIATE_TYPES = Object.freeze({
  PERSON: 'personne_physique',
  COMPANY: 'personne_morale',
});

export const createEmptyAssociate = () => ({
  id: `associate_${Math.random().toString(36).slice(2, 8)}`,
  associateType: ASSOCIATE_TYPES.PERSON,
  firstName: '',
  lastName: '',
  companyName: '',
  siren: '',
  legalForm: 'SAS',
  representativeName: '',
  representativeQuality: '',
  rcsCity: '',
  birthDate: '',
  address: '',
  share: '',
  roleLabel: 'Associé',
  isMinorEmancipated: false,
  legalRepresentatives: '',
});

export const buildAssociateDisplayName = (associate = {}) => {
  if (associate.associateType === ASSOCIATE_TYPES.COMPANY) {
    return String(associate.companyName || associate.raisonSociale || '').trim();
  }
  return [associate.firstName, associate.lastName].filter(Boolean).join(' ').trim();
};

export const isAssociateEntryComplete = (associate = {}) => {
  if (associate.associateType === ASSOCIATE_TYPES.COMPANY) {
    return Boolean(
      String(associate.companyName || '').trim()
      && String(associate.siren || '').trim()
      && String(associate.address || '').trim()
      && String(associate.representativeName || '').trim()
      && LEGAL_ENTITY_SIGNATORY_QUALITIES.includes(String(associate.representativeQuality || '').trim()),
    );
  }
  return Boolean(String(associate.firstName || '').trim() && String(associate.lastName || '').trim());
};

export const buildAssociatesSummary = (associates = []) => associates
  .filter((a) => isAssociateEntryComplete(a))
  .map((a) => {
    const name = buildAssociateDisplayName(a);
    const role = a.roleLabel && !/^associé/i.test(a.roleLabel) ? ` (${a.roleLabel})` : '';
    const parts = [name + role, a.address, a.share ? `${a.share} %` : ''].filter(Boolean);
    return parts.join(', ');
  })
  .join('\n');

export const isAssociatesWizardComplete = (associates = []) => {
  const list = Array.isArray(associates) && associates.length ? associates : [];
  return list.length > 0 && list.every((entry) => isAssociateEntryComplete(entry));
};
