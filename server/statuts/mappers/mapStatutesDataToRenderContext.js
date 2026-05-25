import { resolveWilliamObjetSocialBullets } from '../catalogs/objectSocialCatalog.js';

const formatEurosLabel = (value) => {
  const amount = Number(String(value || '').replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} euros`;
};

const parseAmount = (value) => {
  const amount = Number(String(value || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(amount) ? amount : 0;
};

const legalFormLabel = (form) => {
  const f = String(form || 'SAS').toUpperCase();
  if (f === 'SASU') return 'Société par Actions Simplifiée Unipersonnelle (SASU)';
  if (f === 'SAS') return 'Société par Actions Simplifiée (SAS)';
  return f;
};

export const mapStatutesDataToRenderContext = (statutesData = {}) => {
  const legalForm = String(statutesData.legalForm || 'SAS').toUpperCase();
  const capitalAmount = parseAmount(statutesData.capital) || parseAmount(statutesData.capitalRaw);
  const nombreTitres = parseAmount(statutesData.nombreTitres) || capitalAmount || 5000;
  const objectSocialBullets = resolveWilliamObjetSocialBullets({
    objetSocialBullets: statutesData.objetSocialBullets,
    objetSocial: statutesData.objetSocial,
    businessPurpose: statutesData.objetSocial,
    activity: statutesData.objetSocial,
    activite: statutesData.objetSocial,
  });

  const associates = (statutesData.associates || []).map((associate) => {
    const isLegalEntity = associate.associateType === 'personne_morale';
    const shares = parseAmount(associate.titlesCount) || parseAmount(associate.shares);
    const sharePercentage = parseAmount(associate.share) || (nombreTitres > 0 && shares ? Math.round((shares / nombreTitres) * 1000) / 10 : null);
    const fullName = isLegalEntity
      ? (associate.companyName || associate.label || 'Société associée à compléter')
      : (associate.label || associate.fullName || 'Associé à compléter');
    return {
      isLegalEntity,
      fullName,
      siren: isLegalEntity ? associate.siren : undefined,
      representativeName: isLegalEntity ? associate.representativeName : undefined,
      address: associate.address,
      birthDate: associate.birthDate,
      birthPlace: associate.birthPlace,
      nationality: associate.nationality,
      isMinor: Boolean(associate.isMinor),
      isEmancipated: Boolean(associate.isMinorEmancipated),
      legalRepresentatives: associate.legalRepresentatives
        ? String(associate.legalRepresentatives).split(/\s+et\s+/i).map((s) => s.trim()).filter(Boolean)
        : [],
      shares: shares || null,
      sharePercentage,
      roleLabel: associate.roleLabel || 'Associé',
      cashContributionFormatted: associate.contributionCash
        ? `${formatEurosLabel(associate.contributionCash) || associate.contributionCash}`
        : undefined,
      cashReleasedFormatted: associate.liberationAmount
        ? `${formatEurosLabel(associate.liberationAmount) || associate.liberationAmount}`
        : undefined,
      inKindContributions: associate.contributionInKind && associate.contributionInKind !== 'Aucun'
        ? [{ label: String(associate.contributionInKind), valueFormatted: formatEurosLabel(statutesData.apportsNatureTotal) || 'à compléter' }]
        : [],
    };
  });

  const seat = statutesData.seat || {};
  const registeredOffice = [
    seat.line1,
    seat.line2,
    seat.postalCode && seat.city ? `${seat.postalCode} ${seat.city}` : seat.city,
    seat.country,
    statutesData.domiciliation ? `chez ${statutesData.domiciliation}` : '',
  ].filter(Boolean).join(', ');

  return {
    legalForm,
    company: {
      name: statutesData.denomination || 'Dénomination à compléter',
      sigle: statutesData.sigle && statutesData.sigle !== 'Non prévu' ? statutesData.sigle : undefined,
      legalFormLabel: legalFormLabel(legalForm),
      capitalAmount: capitalAmount || nombreTitres,
      shareCount: nombreTitres,
      capitalFormatted: formatEurosLabel(statutesData.capital) || formatEurosLabel(statutesData.capitalRaw) || `${capitalAmount || nombreTitres} euros`,
      registeredOffice: registeredOffice || 'Siège social à compléter',
      rcsCity: statutesData.greffe,
      durationYears: parseAmount(String(statutesData.duree || '99').replace(/\D/g, '')) || 99,
      fiscalYearEnd: statutesData.exerciceFin,
      firstFiscalYearEnd: statutesData.premierExerciceFin,
    },
    objectSocialBullets,
    associates,
    officers: {
      president: statutesData.president || statutesData.director,
      directorGeneral: statutesData.directeurGeneral && statutesData.directeurGeneral !== 'Aucun'
        ? statutesData.directeurGeneral
        : undefined,
    },
    apports: {
      cashTotalFormatted: formatEurosLabel(statutesData.apportsNumeraireTotal) || formatEurosLabel(statutesData.capital),
      inKindTotalFormatted: formatEurosLabel(statutesData.apportsNatureTotal) || '0 euro',
      depositedFundsFormatted: formatEurosLabel(statutesData.depotFonds) || formatEurosLabel(statutesData.apportsLibérés),
      liberationRate: statutesData.liberationCapital || '50 %',
    },
    execution: {
      city: statutesData.signatureCity || seat.city,
      date: statutesData.signatureDate || statutesData.dateDocument,
      originalsCount: parseAmount(statutesData.exemplairesOriginaux) || 4,
    },
    options: {
      variableCapital: Boolean(statutesData.capitalVariable || statutesData.capitalType === 'Variable'),
      capitalMinFormatted: formatEurosLabel(statutesData.capitalMin),
      capitalMaxFormatted: formatEurosLabel(statutesData.capitalMax),
    },
  };
};
