export const ASSOCIATE_TYPES = Object.freeze({
  PERSON: 'personne_physique',
  COMPANY: 'personne_morale',
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
      && String(associate.address || '').trim(),
    );
  }
  return Boolean(String(associate.firstName || '').trim() && String(associate.lastName || '').trim());
};

export const buildAssociatesSummary = (associates = []) => associates
  .filter((a) => isAssociateEntryComplete(a))
  .map((a) => {
    const name = buildAssociateDisplayName(a);
    const parts = [name, a.address, a.share ? `${a.share} %` : ''].filter(Boolean);
    return parts.join(', ');
  })
  .join('\n');
