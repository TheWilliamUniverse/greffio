import { formatFrenchDate } from '../pdf/nonConvictionPdf.js';

const legalFormLabelFromCode = (form) => {
  const f = String(form || 'SAS').toUpperCase();
  if (f === 'SASU') return 'Société par Actions Simplifiée Unipersonnelle (SASU)';
  if (f === 'SAS') return 'Société par Actions Simplifiée (SAS)';
  if (f === 'SARL') return 'Société à Responsabilité Limitée (SARL)';
  if (f === 'EURL') return 'Entreprise Unipersonnelle à Responsabilité Limitée (EURL)';
  if (f === 'SCI') return 'Société Civile Immobilière (SCI)';
  return f;
};

export const isLegalEntityParty = (party = {}) => (
  party?.associateType === 'personne_morale' || party?.isLegalEntity === true
);

const formatSirenDisplay = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 9) return String(value || '').trim();
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
};

const rolePriority = (roleLabel = '') => {
  const role = String(roleLabel || '');
  if (/président/i.test(role)) return 0;
  if (/directeur\s+général/i.test(role)) return 1;
  if (/gérant/i.test(role)) return 2;
  return 3;
};

export const sortAssociatesPresidentFirst = (associates = []) => (
  [...(associates || [])].sort((a, b) => {
    const delta = rolePriority(a.roleLabel) - rolePriority(b.roleLabel);
    if (delta !== 0) return delta;
    return String(a.label || a.companyName || '').localeCompare(String(b.label || b.companyName || ''), 'fr');
  })
);

/** Ordre canon William : personne morale d’abord, puis rôle, puis nom. */
export const sortAssociatesStatutesCanon = (associates = []) => (
  [...(associates || [])].sort((a, b) => {
    const legalDelta = Number(isLegalEntityParty(a)) - Number(isLegalEntityParty(b));
    if (legalDelta !== 0) return -legalDelta;
    const delta = rolePriority(a.roleLabel) - rolePriority(b.roleLabel);
    if (delta !== 0) return delta;
    return String(a.label || a.companyName || '').localeCompare(String(b.label || b.companyName || ''), 'fr', { sensitivity: 'base' });
  })
);

export const formatStatutesPersonDisplayName = (associate = {}) => {
  const raw = String(
    associate.label || associate.fullName || [associate.firstName, associate.lastName].filter(Boolean).join(' '),
  ).trim() || 'Associé à compléter';
  const parts = raw.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts.slice(0, -1).join(' ')} ${parts[parts.length - 1].toUpperCase()}`;
  }
  return raw;
};

export const LEGAL_ENTITY_SIGNATORY_QUALITIES = Object.freeze(['Président', 'Directeur Général']);

/** Qualité documentaire du signataire PM : uniquement si choisie explicitement (Président ou Directeur Général). */
export const resolveLegalEntitySignatoryQuality = ({ representativeQuality = '' } = {}) => {
  const quality = String(representativeQuality || '').trim();
  return LEGAL_ENTITY_SIGNATORY_QUALITIES.includes(quality) ? quality : '';
};

export const formatLegalEntitySignatureMention = ({
  companyName = '',
  representativeName = '',
  representativeQuality = '',
} = {}) => {
  const company = String(companyName || '').trim();
  const rep = String(representativeName || '').trim();
  const quality = resolveLegalEntitySignatoryQuality({ representativeQuality });
  if (!company) return '';
  if (rep && quality) return `Pour ${company}, représentée par ${rep}, en qualité de ${quality}.`;
  if (rep) return `Pour ${company}, représentée par ${rep}.`;
  return `Pour ${company}.`;
};

export const formatLegalEntityAssociateDescription = (associate = {}, {
  greffeCity,
  companyCapital,
  includeRepresentative = true,
} = {}) => {
  const name = associate.fullName || associate.label || associate.companyName || 'Société associée à compléter';
  const legalForm = associate.legalFormLabel || legalFormLabelFromCode(associate.legalForm);
  const greffe = greffeCity || associate.rcsCity || 'Nice';
  const siren = formatSirenDisplay(associate.siren);
  const sirenPart = siren ? ` sous le numéro ${siren}` : '';
  const rcsPart = `immatriculée au RCS de ${greffe}${sirenPart}`;
  const capital = String(associate.capitalSocial || companyCapital || '').trim();
  const capitalPart = capital ? ` au capital de ${capital}` : '';
  const seatPart = associate.address ? `, dont le siège social est situé ${associate.address}` : '';
  let repPart = '';
  if (includeRepresentative) {
    const repName = String(associate.representativeName || '').trim();
    const repQuality = resolveLegalEntitySignatoryQuality({
      representativeQuality: associate.representativeQuality || associate.representativeRole,
    });
    repPart = repName && repQuality
      ? `, représentée par ${repName}, agissant en qualité de ${repQuality}, dûment habilitée aux fins des présentes`
      : repName
        ? `, représentée par ${repName}`
        : '';
  }
  return `${name}, ${legalForm}${capitalPart}, ${rcsPart}${seatPart}${repPart}.`;
};

export const formatPhysicalPersonIdentityLine = (associate = {}) => {
  const name = associate.label
    || associate.fullName
    || [associate.firstName, associate.lastName].filter(Boolean).join(' ').trim()
    || 'Associé à compléter';
  const addressPart = associate.address ? `demeurant ${associate.address}` : '';
  const birthDate = String(associate.birthDate || '').trim();
  const birthPlace = String(associate.birthPlace || '').trim();
  let birthPart = '';
  if (birthDate || birthPlace) {
    const civility = associate.civility === 'Mme' ? 'e' : '';
    birthPart = `né${civility}${birthDate ? ` le ${birthDate}` : ''}${birthPlace ? ` à ${birthPlace}` : ''}`;
  }
  const nationality = String(associate.nationality || 'française').trim();
  const parts = [name, addressPart, birthPart, nationality ? `de nationalité ${nationality}` : ''].filter(Boolean);
  if (associate.isMinorEmancipated) parts.push('mineur émancipé');
  if (associate.isMinor && !associate.isMinorEmancipated) parts.push('mineur non émancipé');
  return `${parts.join(', ')}.`;
};

export const formatSubscriberListRow = (associate = {}, { securitiesUnit = 'Actions', companyCapital } = {}) => {
  if (isLegalEntityParty(associate)) {
    const companyName = String(associate.label || associate.companyName || '').trim() || 'Société à compléter';
    const repName = String(associate.representativeName || '').trim();
    const repQuality = resolveLegalEntitySignatoryQuality({
      representativeQuality: associate.representativeQuality,
    });
    const roleTitle = String(associate.roleLabel || 'Associé (personne morale)').trim();
    return {
      isLegalEntity: true,
      roleTitle,
      fullName: companyName,
      legalFormLabel: associate.legalFormLabel || legalFormLabelFromCode(associate.legalForm),
      siren: String(associate.siren || '').trim(),
      address: String(associate.address || 'Siège social à compléter').trim(),
      legalRepresentativeName: repName,
      legalRepresentativeQuality: repQuality,
      birthDatePlace: '',
      nationality: '',
      sectionHeading: `${roleTitle} – ${companyName}`,
      identitySummary: formatLegalEntityAssociateDescription(associate, { companyCapital }),
      signatoryLine: repName
        ? `Signataire : ${repName} (${repQuality}), agissant au nom et pour le compte de ${companyName}`
        : 'Représentant légal à compléter',
      titlesCount: String(associate.titlesCount || associate.share || '0').replace(/\s/g, ' ').trim(),
      sharePercent: String(associate.share || '').trim() || '–',
      contributionCash: associate.contributionCash
        ? `${associate.contributionCash}`.replace(/(?<=\d)\s?(?=€)/, ' ')
        : '0 €',
      contributionInKind: associate.contributionInKind ? `${associate.contributionInKind}` : '0 €',
      liberationAmount: associate.liberationAmount
        ? `${associate.liberationAmount}`.replace(/(?<=\d)\s?(?=€)/, ' ')
        : '0 €',
      observations: repName
        ? `Personne morale – représentée par ${repName}, ${repQuality}`
        : 'Personne morale – représentant légal requis',
      securitiesUnit,
    };
  }

  const birthDateRaw = String(associate.birthDate || '').trim();
  const birthPlace = String(associate.birthPlace || '').trim();
  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)
    ? formatFrenchDate(birthDateRaw)
    : birthDateRaw;
  const birthDatePlace = [birthDate, birthPlace ? `à ${birthPlace}` : ''].filter(Boolean).join(' ').trim();
  const fullName = String(associate.label || '').trim()
    || [associate.firstName, associate.lastName].filter(Boolean).join(' ').trim();
  const roleTitle = String(associate.roleLabel || 'Associé').trim();

  let observations = 'Majeur';
  if (associate.isMinorEmancipated) observations = 'Mineur émancipé';
  else if (associate.isMinor) {
    const reps = String(associate.legalRepresentatives || '').trim();
    observations = reps
      ? `Mineur non émancipé, représenté légalement par ${reps} agissant en qualité de titulaires de l'autorité parentale.`
      : 'Mineur non émancipé, représenté légalement par les titulaires de l\'autorité parentale.';
  }

  return {
    isLegalEntity: false,
    roleTitle,
    fullName,
    birthDatePlace: birthDatePlace || 'À compléter',
    nationality: String(associate.nationality || 'Française').trim(),
    address: String(associate.address || 'Adresse à compléter').trim(),
    sectionHeading: `${roleTitle} – ${fullName}`,
    titlesCount: String(associate.titlesCount || associate.share || '0').replace(/\s/g, ' ').trim(),
    sharePercent: String(associate.share || '').trim() || '–',
    contributionCash: associate.contributionCash
      ? `${associate.contributionCash}`.replace(/(?<=\d)\s?(?=€)/, ' ')
      : '0 €',
    contributionInKind: associate.contributionInKind ? `${associate.contributionInKind}` : '0 €',
    liberationAmount: associate.liberationAmount
      ? `${associate.liberationAmount}`.replace(/(?<=\d)\s?(?=€)/, ' ')
      : '0 €',
    observations,
    securitiesUnit,
  };
};

export const resolveOfficerAssociate = (associates = []) => {
  const sorted = sortAssociatesPresidentFirst(associates);
  return sorted.find((a) => /président/i.test(String(a.roleLabel || '')))
    || sorted.find((a) => /gérant/i.test(String(a.roleLabel || '')))
    || sorted[0]
    || null;
};

export const resolveDocumentSignature = ({
  associates = [],
  fallbackName = '',
  fallbackTitle = 'Le Président',
} = {}) => {
  const officer = resolveOfficerAssociate(associates);
  if (officer && isLegalEntityParty(officer)) {
    const companyName = String(officer.label || officer.companyName || '').trim();
    const repName = String(officer.representativeName || '').trim();
    const repQuality = resolveLegalEntitySignatoryQuality({
      representativeQuality: officer.representativeQuality,
    });
    const signatureMention = formatLegalEntitySignatureMention({
      companyName,
      representativeName: repName,
      representativeQuality: repQuality,
    });
    return {
      isLegalEntity: true,
      companyName,
      representativeName: repName,
      representativeQuality: repQuality,
      signatoryName: repName || fallbackName,
      signatoryTitle: fallbackTitle,
      signatureLines: signatureMention
        ? [signatureMention]
        : [
          `Pour ${companyName || 'la personne morale'}`,
          repName ? `Représentée par ${repName}` : 'Représentée par [représentant légal]',
          `Qualité : ${repQuality || 'à compléter'}`,
        ],
      presidentName: repName || fallbackName,
    };
  }

  const personName = officer
    ? (officer.label || [officer.firstName, officer.lastName].filter(Boolean).join(' ').trim())
    : fallbackName;
  return {
    isLegalEntity: false,
    signatoryName: personName,
    signatoryTitle: fallbackTitle,
    signatureLines: [personName ? `${personName},` : fallbackTitle],
    presidentName: personName || fallbackName,
  };
};

export const formatSignatureColumnForParty = (associate = {}) => {
  if (isLegalEntityParty(associate)) {
    const companyName = String(associate.label || associate.companyName || '').trim();
    const repName = String(associate.representativeName || '').trim();
    const repQuality = resolveLegalEntitySignatoryQuality({
      representativeQuality: associate.representativeQuality,
    });
    return {
      name: companyName,
      role: associate.roleLabel || 'Associé (personne morale)',
      mention: 'Lu et approuvé',
      subLines: [
        repName ? `Représentée par ${repName}` : 'Représentant légal à compléter',
        `Qualité : ${repQuality || 'à compléter'}`,
      ],
    };
  }
  return {
    name: associate.label || associate.fullName || 'Associé',
    role: associate.roleLabel || 'Associé',
    mention: 'Lu et approuvé',
    subLines: [],
  };
};

export const validateLegalEntityParties = (associates = [], { requireRepresentative = true } = {}) => {
  const errors = [];
  (associates || []).forEach((associate) => {
    if (!isLegalEntityParty(associate)) return;
    const label = associate.label || associate.companyName || 'Personne morale';
    if (!String(associate.companyName || associate.label || '').trim()) {
      errors.push(`Personne morale sans dénomination : ${label}.`);
    }
    if (requireRepresentative && !String(associate.representativeName || '').trim()) {
      errors.push(`Personne morale sans représentant légal : ${label}.`);
    }
    const signatoryQuality = resolveLegalEntitySignatoryQuality({
      representativeQuality: associate.representativeQuality,
    });
    if (requireRepresentative && !signatoryQuality) {
      errors.push(`Personne morale sans qualité de signataire (Président ou Directeur Général) : ${label}.`);
    }
  });
  return { ok: errors.length === 0, errors };
};

export { legalFormLabelFromCode };
