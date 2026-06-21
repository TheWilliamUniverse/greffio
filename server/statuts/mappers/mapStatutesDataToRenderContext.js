import { resolveWilliamObjetSocialBullets } from '../catalogs/objectSocialCatalog.js';
import { formatFrEuros, formatFrInteger, parseFrenchAmount } from '../shared/numberFormat.js';
import { formatStatutesFiscalEnd } from '../shared/statutesDates.js';
import { resolveGreffeCity, resolveTribunalCommerce } from '../shared/resolveTribunalCommerce.js';
import { sortAssociatesStatutesCanon, resolveLegalEntitySignatoryQuality, formatStatutesPersonDisplayName } from '../../shared/partyIdentityFormatter.js';
import { deriveStatutsCapitalModel, validateStatutsCapitalModel } from '../shared/deriveStatutsCapital.js';
import { resolveGlobalLiberationPercent } from '../shared/parseLiberationPercent.js';
import { resolveLegalFormLabel } from '../../legal/statutes/shared/formatting.js';

const parseAmount = parseFrenchAmount;

const legalFormLabel = (form) => resolveLegalFormLabel(form, { withAcronym: true });

export const mapStatutesDataToRenderContext = (statutesData = {}) => {
  const legalForm = String(statutesData.legalForm || 'SAS').toUpperCase();
  const capitalAmount = parseAmount(statutesData.capital) || parseAmount(statutesData.capitalRaw);
  const shareCount = parseAmount(statutesData.nombreTitres) || capitalAmount || 1000;
  const nominalFromData = parseAmount(statutesData.valeurNominale);
  const liberationPercent = resolveGlobalLiberationPercent({
    liberationCapital: statutesData.liberationCapital,
    liberationRate: statutesData.liberationRate,
    liberationCapitalAutre: statutesData.liberationCapitalAutre,
    liberationCapitalCustom: statutesData.liberationCapitalCustom,
    liberationCapitalDetail: statutesData.liberationCapitalDetail,
  });

  const capitalModel = deriveStatutsCapitalModel({
    capitalAmount,
    shareCount,
    nominalValue: nominalFromData > 0 ? nominalFromData : null,
    liberationPercent,
    associates: sortAssociatesStatutesCanon(statutesData.associates || []),
  });

  const capitalValidation = validateStatutsCapitalModel(capitalModel);
  if (!capitalValidation.ok && capitalAmount > 0 && shareCount > 0) {
    const error = new Error('STATUTES_CAPITAL_INCONSISTENT');
    error.code = 'STATUTES_CAPITAL_INCONSISTENT';
    error.validation = capitalValidation;
    throw error;
  }

  const objectSocialBullets = resolveWilliamObjetSocialBullets({
    objetSocialBullets: statutesData.objetSocialBullets,
    objetSocial: statutesData.objetSocial,
    businessPurpose: statutesData.objetSocial,
    activity: statutesData.objetSocial,
    activite: statutesData.objetSocial,
  });

  const seat = statutesData.seat || {};
  const greffeCity = resolveGreffeCity({ greffe: statutesData.greffe, seat });

  const associates = capitalModel.associatesComputed.map((associate) => {
    const isLegalEntity = associate.associateType === 'personne_morale';
    const fullName = isLegalEntity
      ? (associate.companyName || associate.label || 'Société associée à compléter')
      : formatStatutesPersonDisplayName(associate);
    return {
      isLegalEntity,
      fullName,
      legalFormLabel: isLegalEntity
        ? (associate.legalFormLabel || legalFormLabel(associate.legalForm || legalForm))
        : undefined,
      siren: isLegalEntity ? associate.siren : undefined,
      rcsCity: isLegalEntity ? (associate.rcsCity || greffeCity) : undefined,
      capitalSocial: isLegalEntity ? associate.capitalSocial : undefined,
      representativeName: isLegalEntity ? associate.representativeName : undefined,
      representativeQuality: isLegalEntity
        ? resolveLegalEntitySignatoryQuality({ representativeQuality: associate.representativeQuality })
        : undefined,
      address: associate.address,
      birthDate: isLegalEntity ? undefined : associate.birthDate,
      birthPlace: isLegalEntity ? undefined : associate.birthPlace,
      nationality: isLegalEntity ? undefined : associate.nationality,
      civility: isLegalEntity ? undefined : associate.civility,
      isMinor: Boolean(associate.isMinor),
      isEmancipated: Boolean(associate.isMinorEmancipated),
      legalRepresentatives: associate.legalRepresentatives
        ? String(associate.legalRepresentatives).split(/\s+et\s+/i).map((s) => s.trim()).filter(Boolean)
        : [],
      shares: associate.shares || null,
      sharePercentage: associate.sharePercentage,
      roleLabel: associate.roleLabel || 'Associé',
      cashContributionFormatted: associate.subscribedFormatted || formatFrEuros(associate.subscribedAmount),
      cashReleasedFormatted: associate.releasedFormatted || formatFrEuros(associate.releasedAmount),
      liberationPercent: associate.liberationPercent,
      liberationRateLabel: associate.liberationRateLabel,
      inKindContributions: associate.contributionInKind && associate.contributionInKind !== 'Aucun'
        ? [{ label: String(associate.contributionInKind), valueFormatted: formatFrEuros(statutesData.apportsNatureTotal) || 'à compléter' }]
        : [],
    };
  });

  const registeredOffice = [
    seat.line1,
    seat.line2,
    seat.postalCode && seat.city ? `${seat.postalCode} ${seat.city}` : seat.city,
    seat.country,
    statutesData.domiciliation ? `chez ${statutesData.domiciliation}` : '',
  ].filter(Boolean).join(', ');

  const tribunalResolution = resolveTribunalCommerce({ greffe: statutesData.greffe, seat });
  const tribunalCommerce = tribunalResolution.label;

  return {
    legalForm,
    capitalModel,
    company: {
      name: statutesData.denomination || 'Dénomination à compléter',
      sigle: statutesData.sigle && statutesData.sigle !== 'Non prévu' ? statutesData.sigle : undefined,
      legalFormLabel: legalFormLabel(legalForm),
      capitalAmount: capitalModel.capitalTotal || shareCount,
      shareCount: capitalModel.shareCount,
      nominalValue: capitalModel.nominalValue,
      nominalValueFormatted: capitalModel.nominalValueFormatted,
      capitalFormatted: capitalModel.capitalFormatted || formatFrEuros(statutesData.capital) || `${formatFrInteger(capitalAmount || shareCount)} euros`,
      registeredOffice: registeredOffice || 'Siège social à compléter',
      rcsCity: greffeCity || statutesData.greffe,
      durationYears: parseAmount(String(statutesData.duree || '99').replace(/\D/g, '')) || 99,
      fiscalYearEnd: formatStatutesFiscalEnd(statutesData.exerciceFin),
      firstFiscalYearEnd: formatStatutesFiscalEnd(statutesData.premierExerciceFin),
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
      cashTotalFormatted: capitalModel.capitalFormatted || formatFrEuros(statutesData.apportsNumeraireTotal) || formatFrEuros(statutesData.capital),
      inKindTotalFormatted: formatFrEuros(statutesData.apportsNatureTotal) || '0 euro',
      inKindTotalAmount: parseAmount(statutesData.apportsNatureTotal) || 0,
      depositedFundsFormatted: capitalModel.depositedFundsFormatted,
      liberationRate: capitalModel.liberationRateLabel,
    },
    execution: {
      city: statutesData.signatureCity || seat.city,
      date: statutesData.signatureDate || statutesData.dateDocument,
      originalsCount: parseAmount(statutesData.exemplairesOriginaux) || 4,
    },
    options: {
      variableCapital: Boolean(statutesData.capitalVariable || statutesData.capitalType === 'Variable'),
      capitalMinFormatted: formatFrEuros(statutesData.capitalMin),
      capitalMaxFormatted: formatFrEuros(statutesData.capitalMax),
    },
    jurisdiction: {
      greffeCity,
      tribunalCommerce,
      tribunalCity: tribunalResolution.city,
      tribunalSource: tribunalResolution.source,
      seatHasOwnTribunal: tribunalResolution.hasOwnTribunal,
    },
  };
};
