import { DIRECTOR_LABELS, usesActions, normalizeLegalFormCode } from '../legal/statutes/shared/formatting.js';
import { resolveWilliamObjetSocialBullets } from '../legal/statutes/reference/williamObjetSocialCatalog.js';
import { formatFrInteger, parseFrenchAmount } from '../statuts/shared/numberFormat.js';
import { isLegallyMinor } from './minorAssociateRules.js';
import { resolveOfficersFromAssociates } from './officerFromAssociates.js';
import { resolveGreffeCity } from '../statuts/shared/resolveTribunalCommerce.js';
import { sortAssociatesPresidentFirst } from '../shared/partyIdentityFormatter.js';
import { resolveGlobalLiberationPercent, formatLiberationRateLabel } from '../statuts/shared/parseLiberationPercent.js';

const pick = (...values) => {
  for (const value of values) {
    const normalized = value === undefined || value === null ? '' : String(value).trim();
    if (normalized) return normalized;
  }
  return '';
};

const isPlaceholderValue = (value, markers = ['à compléter', 'à préciser']) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return markers.some((marker) => normalized.includes(marker));
};

const assignEqualSharesIfMissing = (associates = [], totalShares = 0) => {
  if (!associates.length) return associates;
  const hasAnyShare = associates.some((associate) => {
    const sharePct = parseFrenchAmount(String(associate.share || '').replace('%', '').trim());
    const titles = parseFrenchAmount(associate.titlesCount);
    return sharePct > 0 || titles > 0;
  });
  if (hasAnyShare) return associates;

  const total = parseFrenchAmount(totalShares) || associates.length;
  if (associates.length === 1) {
    return associates.map((associate) => ({
      ...associate,
      share: '100 %',
      titlesCount: String(total),
    }));
  }

  const baseShares = Math.floor(total / associates.length);
  let remainder = total - (baseShares * associates.length);
  return associates.map((associate, index) => {
    const shares = baseShares + (index < remainder ? 1 : 0);
    const pct = total > 0 ? Math.round((shares / total) * 1000) / 10 : 0;
    return {
      ...associate,
      share: `${pct} %`,
      titlesCount: String(shares),
    };
  });
};

const buildRepartitionSummary = (associates = [], legalForm = 'SAS') => {
  if (!associates.length) return '';
  if (['SASU', 'EURL'].includes(legalForm) && associates.length === 1) {
    return '100 % de l’associé unique';
  }
  return associates
    .map((associate) => {
      const share = pick(associate.share, associate.percentage);
      return share ? `${associate.label} : ${share}` : associate.label;
    })
    .filter(Boolean)
    .join(' · ');
};

const formatEuros = (value) => {
  const amount = parseFrenchAmount(value);
  if (!amount) return null;
  return formatFrInteger(amount);
};

const enrichAssociatesForCapital = (associates = [], { capitalAmount, totalShares, nominalValue, liberationRate = '50 %' }) => {
  const nominal = parseFrenchAmount(nominalValue) || 1;
  const total = parseFrenchAmount(totalShares) || parseFrenchAmount(capitalAmount) || 1000;
  const liberationPct = parseFrenchAmount(String(liberationRate).replace('%', '').trim()) / 100 || 0.5;

  return associates.map((associate) => {
    let sharePct = parseFrenchAmount(String(associate.share || '').replace('%', '').trim());
    let shares = parseFrenchAmount(associate.titlesCount);
    if (!shares && sharePct > 0) shares = Math.max(1, Math.round((total * sharePct) / 100));
    if (!sharePct && shares > 0) sharePct = Math.round((shares / total) * 1000) / 10;
    const subscribed = (shares || 0) * nominal;
    const cashFormatted = associate.contributionCash || (subscribed ? formatEuros(subscribed) : '');
    const expectedReleased = subscribed > 0 ? Math.round(subscribed * liberationPct) : 0;
    const explicitReleased = parseFrenchAmount(associate.liberationAmount);
    const perAssociateRate = parseFrenchAmount(String(associate.liberationRate || associate.liberationPercent || '').replace('%', '').trim());
    let releasedValue = expectedReleased;
    if (explicitReleased > 0) {
      if (Math.abs(explicitReleased - expectedReleased) <= 1) {
        releasedValue = explicitReleased;
      } else if (explicitReleased <= subscribed + 0.01 && perAssociateRate > 0) {
        releasedValue = explicitReleased;
      }
    }
    const released = releasedValue > 0 ? formatEuros(releasedValue) : '';
    return {
      ...associate,
      share: sharePct ? `${sharePct} %` : associate.share,
      titlesCount: shares ? String(shares) : associate.titlesCount,
      contributionCash: cashFormatted,
      liberationAmount: released,
      liberationRate: perAssociateRate > 0 ? `${perAssociateRate} %` : '',
      liberationPercent: perAssociateRate > 0 ? String(perAssociateRate) : '',
    };
  });
};

const formatPerson = ({ civility, firstName, lastName }) => {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (!name) return '';
  if (civility === 'Mme') return `Madame ${name}`;
  if (civility === 'M.') return `Monsieur ${name}`;
  return name;
};

const parseSeat = (questionnaire = {}) => {
  const line1 = pick(
    questionnaire.registeredOfficeStreet,
    questionnaire.adresseSiege,
    questionnaire.siege,
    questionnaire.adresse,
  );
  const postalCode = pick(questionnaire.registeredOfficePostalCode, questionnaire.codePostal, questionnaire.postalCode);
  const city = pick(questionnaire.registeredOfficeCity, questionnaire.villeSiege, questionnaire.city, questionnaire.ville);
  const country = pick(questionnaire.registeredOfficeCountry, questionnaire.paysSiege, questionnaire.country, 'France');
  const line2 = pick(questionnaire.complementSiege, questionnaire.complementAdresse);

  if (line1 && postalCode && city) {
    const full = [line1, line2, `${postalCode} ${city}`, country].filter(Boolean).join(', ');
    return { line1, line2, postalCode, city, country, full };
  }

  return {
    line1: line1 || 'Adresse du siège à compléter',
    line2: line2 || '',
    postalCode: postalCode || 'Code postal à compléter',
    city: city || 'Ville à compléter',
    country,
    full: line1 || 'Siège social à compléter',
  };
};

const parseAssociateEntry = (entry, fallback = {}) => {
  if (entry?.associateType === 'personne_morale') {
    const companyName = pick(entry.companyName, entry.raisonSociale, entry.label);
    return {
      id: entry.id || `associate_${Math.random().toString(36).slice(2, 8)}`,
      associateType: 'personne_morale',
      label: companyName || 'Société associée à compléter',
      companyName,
      legalForm: pick(entry.legalForm, ''),
      legalFormLabel: pick(entry.legalFormLabel, ''),
      siren: pick(entry.siren, ''),
      rcsCity: pick(entry.rcsCity, entry.greffeCity, ''),
      capitalSocial: pick(entry.capitalSocial, ''),
      representativeName: pick(entry.representativeName, ''),
      representativeQuality: pick(entry.representativeQuality, entry.representativeRole, ''),
      address: pick(entry.address, fallback.address, 'Siège social à compléter'),
      share: pick(entry.percentage, entry.share, ''),
      titlesCount: pick(entry.sharesOrParts, entry.titlesCount, ''),
      isMinor: false,
      isMinorEmancipated: false,
      legalRepresentatives: '',
      birthDate: '',
      birthPlace: '',
      nationality: '',
      roleLabel: pick(entry.roleLabel, entry.role, 'Associé'),
      contributionCash: pick(entry.contributionCash, entry.apportNumeraire, ''),
      liberationRate: pick(entry.liberationRate, entry.liberationPercent, ''),
      liberationAmount: pick(entry.liberationAmount, ''),
      contributionInKind: pick(entry.contributionInKind, entry.apportNature, ''),
    };
  }
  if (typeof entry === 'string') {
    return {
      id: `associate_${Math.random().toString(36).slice(2, 8)}`,
      label: entry,
      address: fallback.address || 'Adresse à compléter',
      nationality: fallback.nationality || 'Française',
      birthDate: '',
      birthPlace: '',
      share: '',
      titlesCount: '',
      isMinor: false,
      isMinorEmancipated: false,
      legalRepresentatives: '',
      roleLabel: 'Associé',
      contributionCash: '',
      liberationRate: '',
      liberationAmount: '',
      contributionInKind: '',
    };
  }
  return {
    id: entry.id || `associate_${Math.random().toString(36).slice(2, 8)}`,
    associateType: 'personne_physique',
    label: pick(entry.label, formatPerson(entry), `${entry.firstName || ''} ${entry.lastName || ''}`.trim()),
    address: pick(entry.address, fallback.address, 'Adresse à compléter'),
    nationality: pick(entry.nationality, fallback.nationality, 'Française'),
    birthDate: pick(entry.birthDate, ''),
    birthPlace: pick(entry.birthPlace, ''),
    share: pick(entry.percentage, entry.share, ''),
    titlesCount: pick(entry.sharesOrParts, entry.titlesCount, ''),
    isMinor: entry.isMinor != null ? Boolean(entry.isMinor) : isLegallyMinor(pick(entry.birthDate, '')),
    isMinorEmancipated: Boolean(entry.isMinorEmancipated),
    legalRepresentatives: pick(entry.legalRepresentatives, entry.legalGuardian, ''),
    roleLabel: pick(entry.roleLabel, entry.role, 'Associé'),
    contributionCash: pick(entry.contributionCash, entry.apportNumeraire, ''),
    liberationRate: pick(entry.liberationRate, entry.liberationPercent, ''),
    liberationAmount: pick(entry.liberationAmount, ''),
    contributionInKind: pick(entry.contributionInKind, entry.apportNature, ''),
    civility: pick(entry.civility, ''),
  };
};

const buildAssociates = (questionnaire = {}, user = null, legalForm = 'SASU') => {
  const founderName = formatPerson({
    civility: pick(questionnaire.civility, user?.profile?.civility),
    firstName: pick(questionnaire.firstName, user?.firstName),
    lastName: pick(questionnaire.lastName, user?.lastName),
  });
  const founderAddress = pick(
    questionnaire.adressePersonnelle,
    user?.profile?.address?.line1
      ? [user.profile.address.line1, user.profile.address.line2, user.profile.address.postalCode, user.profile.address.city].filter(Boolean).join(', ')
      : '',
  );
  const fallback = {
    address: founderAddress || 'Adresse à compléter',
    nationality: pick(questionnaire.nationality, 'Française'),
  };

  if (Array.isArray(questionnaire.associates) && questionnaire.associates.length) {
    return questionnaire.associates.map((entry) => parseAssociateEntry(entry, fallback));
  }

  const summary = pick(questionnaire.associesSummary);
  if (['SAS', 'SARL', 'SCI'].includes(legalForm) && summary) {
    return summary.split(/\n+/).flatMap((block) => block.split(/[,;]+/))
      .map((entry) => entry.trim()).filter(Boolean)
      .map((entry) => parseAssociateEntry(entry, fallback));
  }

  return [parseAssociateEntry({
    label: founderName || pick(questionnaire.dirigeant, 'Associé fondateur à compléter'),
    address: founderAddress,
    nationality: fallback.nationality,
    birthDate: pick(questionnaire.dateNaissance, user?.profile?.birthDate),
    birthPlace: pick(questionnaire.lieuNaissance, ''),
    share: ['SASU', 'EURL'].includes(legalForm) ? '100 %' : pick(questionnaire.repartition, 'Quote-part à préciser'),
    titlesCount: '',
  }, fallback)];
};

export const mapStatutesData = ({ dossier, questionnaire = {}, user = null } = {}) => {
  const legalForm = normalizeLegalFormCode(
    pick(questionnaire.formeJuridique, dossier?.legalForm, dossier?.formeJuridique, 'SASU'),
  ) || 'SASU';
  const denomination = pick(questionnaire.denomination, questionnaire.companyName, dossier?.denomination, dossier?.companyName, 'Dénomination à compléter');
  const capitalRaw = pick(questionnaire.capital, questionnaire.capitalAmount, questionnaire.capitalMontant, dossier?.capital, '1000');
  const capitalFormatted = formatEuros(capitalRaw) || '1 000';
  const seat = parseSeat(questionnaire);
  const directorLabel = DIRECTOR_LABELS[legalForm] || 'Dirigeant';
  const director = pick(
    questionnaire.manager,
    questionnaire.dirigeant,
    questionnaire.dirigeantPrincipal,
    questionnaire.president,
    formatPerson({ firstName: questionnaire.firstName, lastName: questionnaire.lastName }),
    user ? formatPerson({ firstName: user.firstName, lastName: user.lastName }) : '',
    `${directorLabel} à compléter`,
  );
  const objetSocial = pick(
    questionnaire.businessPurpose,
    questionnaire.objetSocial,
    questionnaire.activite,
    questionnaire.activity,
    'La société exerce toute activité compatible avec son objet social, directement ou indirectement.',
  );
  const nombreTitres = pick(questionnaire.nombreActions, questionnaire.nombreTitres, questionnaire.shareCount, '1 000');
  const valeurNominale = pick(
    questionnaire.shareNominalValue,
    questionnaire.valeurNominale,
    formatEuros(Number(String(capitalRaw).replace(/\s/g, '')) / Number(String(nombreTitres).replace(/\s/g, ''))) || '1',
  );
  let associates = buildAssociates(questionnaire, user, legalForm);
  const capitalAmountNum = parseFrenchAmount(capitalRaw) || 1000;
  const totalSharesNum = parseFrenchAmount(nombreTitres) || capitalAmountNum;
  associates = assignEqualSharesIfMissing(associates, totalSharesNum);
  const liberationPercent = resolveGlobalLiberationPercent({
    liberationCapital: questionnaire.liberationCapital,
    liberationCapitalAutre: questionnaire.liberationCapitalAutre,
    liberationCapitalCustom: questionnaire.liberationCapitalCustom,
    liberationCapitalDetail: questionnaire.liberationCapitalDetail,
  });
  const liberationRate = formatLiberationRateLabel(liberationPercent);
  associates = enrichAssociatesForCapital(associates, {
    capitalAmount: capitalAmountNum,
    totalShares: totalSharesNum,
    nominalValue: valeurNominale,
    liberationRate,
  });
  associates = sortAssociatesPresidentFirst(associates);
  const officersFromAssociates = resolveOfficersFromAssociates(questionnaire.associates || [], {
    fallbackPresident: pick(questionnaire.president, director),
    fallbackDirectorGeneral: pick(questionnaire.directeurGeneral, questionnaire.directeursGeneraux, 'Aucun'),
  });
  const presidentLabel = officersFromAssociates.president;
  const directeurGeneralLabel = officersFromAssociates.directeurGeneral;
  const directorResolved = pick(officersFromAssociates.president, director);
  let repartition = pick(questionnaire.repartition, questionnaire.associesSummary, '');
  if (isPlaceholderValue(repartition)) {
    repartition = buildRepartitionSummary(associates, legalForm);
  }
  if (!repartition && ['SASU', 'EURL'].includes(legalForm)) {
    repartition = '100 % de l’associé unique';
  }
  const objetSocialBullets = resolveWilliamObjetSocialBullets({
    ...questionnaire,
    objetSocial,
    activity: pick(questionnaire.activity, questionnaire.activite),
  });
  const capitalRepartitionLines = associates.map((a) => {
    const security = usesActions(legalForm) ? 'actions' : 'parts sociales';
    const securitySingular = usesActions(legalForm) ? 'action' : 'part sociale';
    return `${a.label} : ${a.share || '–'} des ${security}, soit ${a.titlesCount || '–'} ${securitySingular}${Number(a.titlesCount) > 1 ? 's' : ''}.`;
  });
  // Représentation des mineurs : couverte dans le préambule (« Représenté(e) légalement par… »).
  const minorRepresentationNote = null;

  const data = {
    reference: pick(dossier?.reference, dossier?.id, 'GF-REF'),
    legalForm,
    denomination,
    sigle: pick(questionnaire.sigle, questionnaire.tradeName, 'Non prévu'),
    nomCommercial: pick(questionnaire.nomCommercial, questionnaire.nomEnseigne, 'Non prévu'),
    objetSocial,
    objetSocialBullets,
    seat,
    domiciliation: pick(questionnaire.domiciliation, questionnaire.domicileSiege, ''),
    mailingAddress: pick(questionnaire.mailingAddress, questionnaire.adresseCourrier, questionnaire.courrierSiege, ''),
    duree: pick(questionnaire.duration, questionnaire.duree, '99 années'),
    capital: capitalFormatted,
    capitalRaw,
    capitalType: pick(questionnaire.capitalVariable, questionnaire.capitalType, 'Fixe'),
    capitalVariable: ['variable', 'Variable', true].includes(questionnaire.capitalVariable),
    capitalMin: pick(questionnaire.capitalMin, ''),
    capitalMax: pick(questionnaire.capitalMax, '5 000 000'),
    liberationCapital: liberationRate,
    apportsNumeraire: pick(questionnaire.contributions?.cash, questionnaire.apportsNumeraire, 'Oui'),
    apportsNature: pick(questionnaire.contributions?.inKind, questionnaire.apportsNature, 'Non'),
    detailApportsNature: pick(questionnaire.detailApportsNature, 'Aucun apport en nature'),
    nombreTitres,
    valeurNominale,
    repartition,
    capitalRepartitionLines,
    associates,
    director: directorResolved,
    president: presidentLabel,
    directorRole: directorLabel,
    directeurGeneral: directeurGeneralLabel,
    beneficiairesEffectifs: pick(questionnaire.beneficiairesEffectifs, questionnaire.beneficialOwners, director),
    directeursGeneraux: pick(questionnaire.directeursGeneraux, 'Aucun'),
    apportsNumeraireTotal: pick(questionnaire.apportsNumeraireTotal, capitalFormatted),
    apportsNatureTotal: pick(questionnaire.apportsNatureTotal, ''),
    depotFonds: (() => {
      const liberationPct = parseFrenchAmount(String(liberationRate).replace('%', '')) / 100 || 0.5;
      const fromAssociates = associates.reduce((sum, associate) => {
        const released = parseFrenchAmount(associate.liberationAmount);
        if (released > 0) return sum + released;
        const cash = parseFrenchAmount(associate.contributionCash);
        return sum + (cash > 0 ? Math.round(cash * liberationPct) : 0);
      }, 0);
      return pick(
        questionnaire.depotFonds,
        questionnaire.apportsLibérés,
        fromAssociates > 0 ? formatEuros(fromAssociates) : formatEuros(Math.round(capitalAmountNum * liberationPct)),
      );
    })(),
    premierExerciceFin: pick(
      questionnaire.premierExerciceFin,
      questionnaire.premierExerciceCloture,
      `31 décembre ${new Date().getFullYear()}`,
    ),
    inalienabiliteAnnees: pick(questionnaire.inalienabiliteAnnees, questionnaire.dureeInalienabilite, 'cinq (5)'),
    exemplairesOriginaux: pick(questionnaire.exemplairesOriginaux, ''),
    minorRepresentationNote,
    exerciceDebut: pick(questionnaire.exerciceDebut, '1er janvier'),
    exerciceFin: pick(questionnaire.fiscalYearEnd, questionnaire.dateCloture, questionnaire.exerciceFin, '31 décembre'),
    clauseAgrement: pick(questionnaire.clauseAgrement, ['SAS', 'SARL', 'SCI'].includes(legalForm) ? 'Oui' : 'Oui'),
    clausePreemption: pick(questionnaire.clausePreemption, 'À décider'),
    clauseExclusion: pick(questionnaire.clauseExclusion, 'Non prévue'),
    clauseInalienabilite: pick(questionnaire.clauseInalienabilite, 'Non'),
    consultationsEcrites: pick(questionnaire.consultationsEcrites, 'Autorisées'),
    quorumMajorite: pick(questionnaire.quorumMajorite, 'Règles légales'),
    mediation: pick(questionnaire.mediationArbitrage, 'Médiation préalable'),
    affectationResultat: pick(questionnaire.affectationResultat, 'Décision annuelle'),
    greffe: (() => {
      const raw = pick(
        questionnaire.registryCity,
        questionnaire.rcsCompetent,
        seat.city !== 'Ville à compléter' ? seat.city : 'greffe compétent',
      );
      return resolveGreffeCity({ greffe: raw, seat }) || raw;
    })(),
    mandataire: 'WILLIAM ESTABLISHMENTS',
    isRegistered: Boolean(questionnaire.isRegistered),
    signatureCity: pick(questionnaire.signatureCity, seat.city),
    signatureDate: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    dateDocument: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    actsInFormation: Array.isArray(questionnaire.actsInFormation) ? questionnaire.actsInFormation : [],
    usesActions: usesActions(legalForm),
  };

  const directorCheckLabel = `${directorLabel} / dirigeant`;
  const securitiesLabel = usesActions(legalForm) ? 'Répartition des actions' : 'Répartition des parts sociales';

  const requiredChecks = [
    { key: 'denomination', label: 'Dénomination sociale', ok: !isPlaceholderValue(denomination, ['dénomination à compléter']) },
    { key: 'objetSocial', label: 'Objet social', ok: Boolean(objetSocial) && !isPlaceholderValue(objetSocial) },
    { key: 'siege', label: 'Siège social complet', ok: !isPlaceholderValue(seat.line1, ['adresse du siège à compléter']) && !isPlaceholderValue(seat.postalCode, ['code postal à compléter']) && !isPlaceholderValue(seat.city, ['ville à compléter']) },
    { key: 'capital', label: 'Capital social', ok: Boolean(formatEuros(capitalRaw)) },
    { key: 'director', label: directorCheckLabel, ok: !isPlaceholderValue(directorResolved) },
    { key: 'repartition', label: securitiesLabel, ok: !isPlaceholderValue(repartition) },
    { key: 'beneficiairesEffectifs', label: 'Bénéficiaires effectifs', ok: Boolean(data.beneficiairesEffectifs) && !isPlaceholderValue(data.beneficiairesEffectifs) },
  ];

  const completeness = Math.round((requiredChecks.filter((item) => item.ok).length / requiredChecks.length) * 100);

  return {
    ...data,
    checks: requiredChecks,
    completeness,
    missingFields: requiredChecks.filter((item) => !item.ok).map((item) => item.label),
    metadataBundle: { completeness, missingFields: requiredChecks.filter((item) => !item.ok).map((item) => item.label) },
  };
};

export const mapStatutesDataFromSimulator = ({ data = {}, answers = {}, user = null } = {}) => {
  const legalForm = pick(
    answers.formeJuridique,
    data.legalForm,
    data.formeJuridique,
    'SASU',
  ).toUpperCase();

  const questionnaire = {
    ...data,
    ...answers,
    formeJuridique: legalForm,
    denomination: pick(answers.denomination, data.companyName, data.denomination),
    companyName: pick(answers.denomination, data.companyName, data.denomination),
    capital: pick(answers.capitalMontant, answers.capital, data.capital),
    capitalAmount: pick(answers.capitalMontant, answers.capital, data.capital),
    nombreTitres: pick(answers.nombreActions, answers.nombreTitres, answers.shareCount, data.nombreTitres),
    adresseSiege: pick(answers.adresseSiege, data.adresseSiege),
    codePostal: pick(answers.codePostal, data.codePostal),
    villeSiege: pick(answers.villeSiege, data.city, data.villeSiege),
    paysSiege: pick(answers.paysSiege, data.paysSiege, 'France'),
    objetSocial: pick(answers.objetSocial, data.activity, data.objetSocial, data.activite),
    activite: pick(answers.objetSocial, data.activity, data.objetSocial, data.activite),
    dirigeant: pick(answers.dirigeantPrincipal, answers.president, data.president, data.initiatorName),
    manager: pick(answers.dirigeantPrincipal, answers.president, data.president),
    president: pick(answers.president, answers.dirigeantPrincipal, data.president),
    directeurGeneral: pick(answers.directeursGeneraux, data.directeurGeneral),
    repartition: pick(answers.repartition, answers.associesSummary, data.repartition),
    associesSummary: pick(answers.repartition, answers.associesSummary),
    associates: Array.isArray(answers.associates) ? answers.associates : data.associates,
    beneficiairesEffectifs: pick(
      answers.beneficiaireEffectif,
      answers.beneficiairesEffectifs,
      data.beneficiairesEffectifs,
    ),
    sigle: pick(answers.sigle, data.sigle),
    nomCommercial: pick(answers.nomCommercial, data.nomCommercial),
    domiciliation: pick(answers.domiciliation, data.domiciliation),
    registryCity: pick(answers.rcsCompetent, answers.villeSiege, data.city),
    fiscalYearEnd: pick(answers.dateCloture, answers.fiscalYearEnd, data.dateCloture),
    duration: pick(answers.duree, data.duree),
    capitalVariable: answers.capitalType === 'Variable',
    capitalMin: pick(answers.capitalPlancher, answers.capitalMin),
    capitalMax: pick(answers.capitalPlafond, answers.capitalMax),
    liberationCapital: pick(answers.liberationCapital, '100 %'),
    apportsNumeraire: pick(answers.apportsNumeraire, data.apportsNumeraire),
    apportsNature: pick(answers.apportsNature, data.apportsNature),
    detailApportsNature: pick(answers.detailApportsNature, data.detailApportsNature),
    clauseAgrement: pick(answers.clauseAgrement, data.clauseAgrement),
    clausePreemption: pick(answers.clausePreemption, data.clausePreemption),
    clauseExclusion: pick(answers.clauseExclusion, data.clauseExclusion),
    clauseInalienabilite: pick(answers.clauseInalienabilite, data.clauseInalienabilite),
    consultationsEcrites: pick(answers.consultationsEcrites, data.consultationsEcrites),
    quorumMajorite: pick(answers.quorumMajorite, data.quorumMajorite),
    mediationArbitrage: pick(answers.mediationArbitrage, data.mediationArbitrage),
    affectationResultat: pick(answers.affectationResultat, data.affectationResultat),
    firstName: pick(answers.firstName, data.firstName),
    lastName: pick(answers.lastName, data.lastName),
    email: pick(answers.email, data.email),
    phone: pick(answers.phone, data.phone),
  };

  return mapStatutesData({
    dossier: {
      reference: pick(data.reference, 'SIM-PREVIEW'),
      legalForm,
      denomination: questionnaire.denomination,
      companyName: questionnaire.companyName,
    },
    questionnaire,
    user,
  });
};

export { pick, formatPerson };
