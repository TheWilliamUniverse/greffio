const normalize = (value = '') => String(value)
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

export const resolveServiceFromFormality = (typeFormalite = '', formeJuridique = '') => {
  const type = String(typeFormalite || '').toLowerCase();
  const form = normalize(formeJuridique);

  if (type === 'etablissement_secondaire_creation') return 'creation-etablissement-secondaire';
  if (type === 'transfert_siege') return 'transfert-siege';
  if (type === 'dissolution_liquidation_radiation') return 'dissolution-liquidation-radiation';
  if (type === 'depot_comptes_annuels') return 'depot-comptes-annuels';
  if (type === 'modification_entreprise') return 'modification';
  if (type === 'micro_entreprise') return 'micro-entreprise';
  if (type === 'entreprise_individuelle' || form === 'EI') return 'creation-ei';
  if (form === 'SCI') return 'creation-sci';
  if (form === 'SARL' || form === 'EURL') return 'creation-sarl';
  if (form === 'SAS' && !form.includes('SASU')) return 'creation-sas';
  if (form === 'SASU' || form.includes('SASU')) return 'creation-sasu';
  if (type === 'creation_sas') return 'creation-sas';
  if (type === 'creation_sasu') return 'creation-sasu';
  return 'creation-sasu';
};

export const resolveLegalFormFromQuestionnaire = ({ dossier, questionnaire = {} } = {}) => {
  const form = String(questionnaire.formeJuridique || questionnaire.legalForm || '').trim();
  if (form) return form.toUpperCase();
  if (dossier?.legalForm) return String(dossier.legalForm).toUpperCase();
  return '';
};
