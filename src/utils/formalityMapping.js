const normalize = (value = '') => String(value)
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

/** Pré-remplit forme juridique + type formalité depuis une clé démarche questionnaire. */
export const resolveDemarchePreset = (demarcheKey = '') => {
  const key = String(demarcheKey || '').trim();
  const presets = {
    creation_sasu: { typeFormalite: 'creation_societe', formeJuridique: 'SASU' },
    creation_sas: { typeFormalite: 'creation_societe', formeJuridique: 'SAS' },
    creation_sarl: { typeFormalite: 'creation_societe', formeJuridique: 'SARL' },
    creation_eurl: { typeFormalite: 'creation_societe', formeJuridique: 'EURL' },
    creation_sci: { typeFormalite: 'creation_societe', formeJuridique: 'SCI' },
    creation_societe: { typeFormalite: 'creation_societe', formeJuridique: '' },
    micro_entreprise: { typeFormalite: 'micro_entreprise', formeJuridique: 'MICRO-ENTREPRISE' },
    entreprise_individuelle: { typeFormalite: 'entreprise_individuelle', formeJuridique: 'EI' },
  };
  return presets[key] || { typeFormalite: key, formeJuridique: '' };
};

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
  if (type === 'creation_sarl') return 'creation-sarl';
  if (type === 'creation_eurl') return 'creation-eurl';
  if (type === 'creation_sci') return 'creation-sci';
  return 'creation-sasu';
};

export const resolveLegalFormFromContext = ({
  formeJuridique = '',
  typeFormalite = '',
  service = '',
} = {}) => {
  const form = normalize(formeJuridique);
  if (form) return form === 'MICRO ENTREPRISE' ? 'MICRO-ENTREPRISE' : formeJuridique.toUpperCase();

  const preset = resolveDemarchePreset(typeFormalite);
  if (preset.formeJuridique) return preset.formeJuridique;

  const serviceKey = String(service || '').toLowerCase();
  if (serviceKey.includes('sasu')) return 'SASU';
  if (serviceKey === 'creation-sas') return 'SAS';
  if (serviceKey.includes('sarl')) return 'SARL';
  if (serviceKey.includes('eurl')) return 'EURL';
  if (serviceKey.includes('sci')) return 'SCI';
  if (serviceKey.includes('ei') || serviceKey.includes('micro')) return 'EI';
  return '';
};

export const matchLegalForm = (candidates = []) => {
  const values = candidates.map(normalize).filter(Boolean);
  const isEi = values.some((v) => v.includes('MICRO') || v.includes('AUTO ENTREPRENEUR') || v === 'EI' || v.includes('ENTREPRISE INDIVIDUELLE'));
  if (isEi) return 'EI';
  if (values.some((v) => v === 'SCI' || v.includes('SOCIETE CIVILE IMMOBILIERE'))) return 'SCI';
  if (values.some((v) => v === 'EURL')) return 'EURL';
  if (values.some((v) => v === 'SARL')) return 'SARL';
  if (values.some((v) => v.includes('SAS') && !v.includes('SASU'))) return 'SAS';
  if (values.some((v) => v.includes('SASU'))) return 'SASU';
  return 'SASU';
};

export const resolveSimulatorFormFromQuery = (formalityParam = '') => {
  const value = normalize(formalityParam);
  if (value.includes('EI') || value.includes('MICRO')) {
    return { journey: 'creation', legalForm: 'Micro-entreprise' };
  }
  if (value.includes('SASU')) {
    return { journey: 'creation', legalForm: 'SASU' };
  }
  if (value.includes('SAS')) {
    return { journey: 'creation', legalForm: 'SAS' };
  }
  if (value.includes('SARL')) {
    return { journey: 'creation', legalForm: 'SARL' };
  }
  return null;
};

/** Mappe le brouillon simulateur vers le questionnaire dossier. */
export const mapSimulatorDraftToQuestionnaire = (draft = {}) => {
  if (!draft || typeof draft !== 'object') return {};
  const journey = String(draft.journey || draft.data?.journey || 'statuts').toLowerCase();
  const legalForm = String(draft.legalForm || draft.data?.legalForm || '').trim();
  const typeFormalite = journey === 'statuts' || journey === 'creation'
    ? (legalForm.toUpperCase().includes('SASU') ? 'creation_sasu'
      : legalForm.toUpperCase().includes('SAS') ? 'creation_sas'
        : legalForm.toUpperCase().includes('SARL') ? 'creation_sarl'
          : legalForm.toUpperCase().includes('EI') || legalForm.toLowerCase().includes('micro') ? 'micro_entreprise'
            : 'creation_societe')
    : String(draft.typeFormalite || draft.data?.typeFormalite || '');
  const preset = resolveDemarchePreset(typeFormalite);
  return {
    typeFormalite: preset.typeFormalite || typeFormalite,
    formeJuridique: preset.formeJuridique || legalForm.toUpperCase(),
    denomination: draft.companyName || draft.data?.companyName || draft.denomination || '',
    activite: draft.activity || draft.data?.activity || '',
    capital: draft.capital || draft.data?.capital || '',
    initiatorType: draft.initiatorType || draft.data?.initiatorType || '',
    firstName: draft.firstName || draft.data?.firstName || '',
    lastName: draft.lastName || draft.data?.lastName || '',
    email: draft.email || draft.data?.email || '',
    phone: draft.phone || draft.data?.phone || '',
  };
};
