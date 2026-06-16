export const MINOR_DOC_KEYS = Object.freeze({
  EMANCIPATION: 'minor_emancipation_order',
  AUTHORIZATION: 'minor_parental_authorization',
});

const normalizeName = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const parseBirthDate = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fr = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (fr) {
    const [, day, month, year] = fr;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getAgeYears = (birthDateValue, referenceDate = new Date()) => {
  const birthDate = parseBirthDate(birthDateValue);
  if (!birthDate) return null;
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  let age = ref.getFullYear() - birthDate.getFullYear();
  const monthDiff = ref.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};

export const isLegallyMinor = (birthDateValue, referenceDate = new Date()) => {
  const age = getAgeYears(birthDateValue, referenceDate);
  return age == null ? false : age < 18;
};

export const isYoungEntrepreneurEligible = (birthDateValue, maxAge = 25) => {
  const age = getAgeYears(birthDateValue);
  return age != null && age <= maxAge;
};

const buildAssociateLabel = (entry = {}) => {
  const label = String(entry.label || '').trim();
  if (label) return label;
  if (entry.associateType === 'personne_morale') {
    return String(entry.companyName || entry.raisonSociale || '').trim();
  }
  return [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim();
};

export const normalizeAssociatesFromQuestionnaire = (questionnaire = {}) => {
  const list = Array.isArray(questionnaire.associates) ? questionnaire.associates : [];
  return list.map((entry, index) => {
    if (entry.associateType === 'personne_morale') {
      return {
        id: entry.id || `associate_${index + 1}`,
        label: buildAssociateLabel(entry),
        associateType: 'personne_morale',
        companyName: entry.companyName || '',
        siren: entry.siren || '',
        address: entry.address || '',
        share: entry.share || '',
        roleLabel: entry.roleLabel || entry.role || 'Associé',
        isMinor: false,
        isMinorEmancipated: false,
        legalRepresentatives: '',
      };
    }
    const birthDate = entry.birthDate || '';
    const minorFromAge = isLegallyMinor(birthDate);
    const isMinor = entry.isMinor != null ? Boolean(entry.isMinor) : minorFromAge;
    return {
      id: entry.id || `associate_${index + 1}`,
      label: buildAssociateLabel(entry),
      firstName: entry.firstName || '',
      lastName: entry.lastName || '',
      birthDate,
      address: entry.address || '',
      share: entry.share || '',
      roleLabel: entry.roleLabel || entry.role || 'Associé',
      isMinor,
      isMinorEmancipated: Boolean(entry.isMinorEmancipated),
      legalRepresentatives: entry.legalRepresentatives || entry.legalGuardian || '',
    };
  });
};

export const getMinorDocumentRequirements = (questionnaire = {}) => {
  const associates = normalizeAssociatesFromQuestionnaire(questionnaire);
  const needsEmancipation = associates.some((a) => a.isMinor && a.isMinorEmancipated);
  const needsAuthorization = associates.some((a) => a.isMinor && !a.isMinorEmancipated);
  return { needsEmancipation, needsAuthorization, associates };
};

const namesMatch = (associate, directorName) => {
  const director = normalizeName(directorName);
  if (!director) return false;
  if (associate.associateType === 'personne_morale') {
    return false;
  }
  const candidates = [
    normalizeName(associate.label),
    normalizeName(`${associate.firstName} ${associate.lastName}`),
    normalizeName(associate.firstName),
    normalizeName(associate.lastName),
  ].filter(Boolean);
  return candidates.some((candidate) => candidate === director || director.includes(candidate) || candidate.includes(director));
};

export const validateDirectorEligibility = (questionnaire = {}) => {
  const directorName = questionnaire.dirigeant || questionnaire.president || questionnaire.manager || '';
  const associates = normalizeAssociatesFromQuestionnaire(questionnaire);
  const blocked = associates.find((a) => a.isMinor && !a.isMinorEmancipated && namesMatch(a, directorName));
  if (blocked) {
    return {
      ok: false,
      message: `${blocked.label || 'Cet associé'} est mineur non émancipé : il ne peut pas exercer de fonction de direction. Il peut être associé, représenté par ses représentants légaux.`,
    };
  }
  return { ok: true };
};

export const getMinorAssociateWarnings = (questionnaire = {}) => {
  const warnings = [];
  const { needsEmancipation, needsAuthorization, associates } = getMinorDocumentRequirements(questionnaire);
  associates.filter((a) => a.isMinor).forEach((associate) => {
    if (associate.isMinorEmancipated) {
      warnings.push(`${associate.label} : mineur émancipé – ordonnance d'émancipation à déposer dans votre espace.`);
    } else {
      warnings.push(`${associate.label} : mineur non émancipé – associé possible avec autorisation parentale/tuteur ; pas de fonction de direction.`);
      if (!associate.legalRepresentatives) {
        warnings.push(`Indiquez les représentants légaux de ${associate.label}.`);
      }
    }
  });
  if (needsEmancipation) {
    warnings.push("Pièce requise : ordonnance ou jugement d'émancipation (PDF).");
  }
  if (needsAuthorization) {
    warnings.push('Pièce requise : autorisation des représentants légaux pour la participation au capital.');
  }
  const directorCheck = validateDirectorEligibility(questionnaire);
  if (!directorCheck.ok) warnings.push(directorCheck.message);
  return warnings;
};
