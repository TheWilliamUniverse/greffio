import { LEGAL_FORM_LABELS, usesActions } from '../../legal/statutes/shared/formatting.js';
import { formatFrenchDate } from '../../pdf/nonConvictionPdf.js';
import { mapStatutesData } from '../../utils/statutesDataMapper.js';
import { parseFrenchAmount, formatFrInteger } from '../../statuts/shared/numberFormat.js';
import {
  formatSubscriberListRow,
  resolveDocumentSignature,
  sortAssociatesPresidentFirst,
  validateLegalEntityParties,
} from '../../shared/partyIdentityFormatter.js';

const LEGAL_FORM_SUBTITLE = Object.freeze({
  SAS: 'Société par actions simplifiée en formation',
  SASU: 'Société par actions simplifiée unipersonnelle en formation',
  SARL: 'Société à responsabilité limitée en formation',
  EURL: 'Entreprise unipersonnelle à responsabilité limitée en formation',
  SCI: 'Société civile immobilière en formation',
});

const formatEuroDisplay = (value) => {
  const amount = parseFrenchAmount(String(value || '').replace(/€/g, ''));
  if (!amount) return 'Néant';
  return `${formatFrInteger(amount)} €`;
};

const formatBirthDatePlaceDisplay = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return 'À compléter';
  const isoWithPlace = value.match(/^(\d{4}-\d{2}-\d{2})\s+(à\s+.+)$/i);
  if (isoWithPlace) {
    return `${formatFrenchDate(isoWithPlace[1])} ${isoWithPlace[2]}`.trim();
  }
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})(.*)$/);
  if (isoMatch) {
    const dateFr = formatFrenchDate(isoMatch[1]);
    return `${dateFr}${isoMatch[2] || ''}`.trim();
  }
  return value;
};

const formatCapitalDisplay = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return 'À préciser';
  if (/€/.test(value)) return value;
  const amount = parseFrenchAmount(value);
  return amount ? `${formatFrInteger(amount)} €` : value;
};

const securitiesSubscriptionPhrase = (securitiesUnit) => (
  securitiesUnit.toLowerCase() === 'actions' ? "d'actions" : 'de parts sociales'
);

const resolveQualityLabel = (subscriber = {}) => {
  const role = String(subscriber.roleTitle || 'Associé').trim();
  if (/président/i.test(role)) return 'Président désigné / Souscripteur';
  if (/gérant/i.test(role)) return 'Gérant / Souscripteur';
  return `${role} / Souscripteur`;
};

const enrichSubscriberContributions = (row = {}, securitiesUnit = 'Actions') => {
  const cashFormatted = formatEuroDisplay(row.contributionCash);
  const cashNum = parseFrenchAmount(String(row.contributionCash || '').replace(/€/g, ''));
  const shares = parseFrenchAmount(String(row.titlesCount || '0'));
  const inKindRaw = parseFrenchAmount(String(row.contributionInKind || '').replace(/€/g, ''));
  const inKindComputed = inKindRaw || Math.max(0, shares - cashNum);
  const liberation = formatEuroDisplay(row.liberationAmount || (cashNum ? Math.round(cashNum * 0.5) : 0));
  return {
    ...row,
    qualityLabel: resolveQualityLabel(row),
    birthDatePlace: formatBirthDatePlaceDisplay(row.birthDatePlace),
    titlesCount: formatFrInteger(shares) || '0',
    sharePercent: String(row.sharePercent || '').includes('%')
      ? row.sharePercent
      : `${formatFrInteger(parseFrenchAmount(row.sharePercent))} %`,
    contributionCash: cashFormatted === 'Néant' ? '0 €' : cashFormatted,
    contributionInKind: inKindComputed ? `${formatFrInteger(inKindComputed)} €` : 'Néant',
    liberationAmount: liberation === 'Néant' ? '0 €' : liberation,
    securitiesUnit,
  };
};

const buildRecap = (subscribers = []) => {
  const totalShares = subscribers.reduce((sum, row) => sum + parseFrenchAmount(row.titlesCount), 0);
  const totalCash = subscribers.reduce((sum, row) => sum + parseFrenchAmount(String(row.contributionCash).replace(/€/g, '')), 0);
  const totalInKind = subscribers.reduce((sum, row) => {
    const raw = String(row.contributionInKind || '');
    if (/néant/i.test(raw)) return sum;
    return sum + parseFrenchAmount(raw.replace(/€/g, ''));
  }, 0);
  const totalLiberated = subscribers.reduce((sum, row) => sum + parseFrenchAmount(String(row.liberationAmount).replace(/€/g, '')), 0);
  const totalPercent = subscribers.reduce((sum, row) => sum + parseFrenchAmount(String(row.sharePercent).replace('%', '')), 0);
  return {
    totalShares: formatFrInteger(totalShares) || '0',
    totalCash: totalCash ? `${formatFrInteger(totalCash)} €` : '0 €',
    totalInKind: totalInKind ? `${formatFrInteger(totalInKind)} €` : 'Néant',
    totalLiberated: totalLiberated ? `${formatFrInteger(totalLiberated)} €` : '0 €',
    totalPercent: `${formatFrInteger(totalPercent || 100)} %`,
  };
};

const buildDepositParagraph = (amountLabel, deposited) => {
  if (deposited) {
    return `La somme de ${amountLabel}, correspondant aux apports en numéraire libérés à la constitution, a été déposée sur un compte ouvert au nom de la société en formation, conformément à l'attestation du dépositaire des fonds.`;
  }
  return `La somme de ${amountLabel}, correspondant aux apports en numéraire libérés à la constitution, sera déposée sur un compte ouvert au nom de la société en formation auprès du dépositaire des fonds, conformément aux dispositions légales applicables.`;
};

const buildCertificationParagraph = ({ securitiesUnit, signatoryTitle, singleSubscriber }) => {
  const signatory = signatoryTitle || 'le président désigné';
  if (singleSubscriber) {
    return `Le présent état constate la souscription de l'intégralité du capital social de la société en formation et le versement de la fraction libérée des apports en numéraire indiqués ci-dessus. ${signatory} certifie que les informations qui y figurent sont exactes, sincères et complètes.`;
  }
  const unitPhrase = securitiesSubscriptionPhrase(securitiesUnit);
  return `Le présent état constate les souscriptions ${unitPhrase} composant le capital social de la société en formation et la libération des apports indiqués ci-dessus. ${signatory} certifie que les informations qui y figurent sont exactes, sincères et complètes.`;
};

const hasCapitalDepositAttestation = (documents = []) => (
  documents.some((doc) => doc.docKey === 'capital_certificate' && (
    doc.status === 'uploaded'
    || doc.status === 'signed'
    || doc.status === 'validated'
    || Boolean(doc.storageUrl || doc.fileUrl)
  ))
);

const usesObsoleteSubscribersBoilerplate = (value = '') => (
  /souscriptions de actions/i.test(value)
  || /constate la souscription des actions et le versement de la moitié/i.test(value)
  || /certifié exact, sincère et véritable par/i.test(value)
  || /Rappel : le président désigné certifie l'exactitude/i.test(value)
);

export const buildSubscribersListFields = ({
  dossier,
  questionnaire = {},
  user = null,
  savedFields = {},
  documents = [],
} = {}) => {
  const data = mapStatutesData({ dossier, questionnaire, user });
  const legalForm = String(data.legalForm || 'SAS').toUpperCase();
  const securitiesUnit = usesActions(legalForm) ? 'Actions' : 'Parts sociales';
  const sortedAssociates = sortAssociatesPresidentFirst(data.associates || []);
  const subscribers = sortedAssociates.map((associate) => enrichSubscriberContributions(
    formatSubscriberListRow(associate, { securitiesUnit, companyCapital: data.capital }),
    securitiesUnit,
  ));
  const recap = buildRecap(subscribers);
  const depositTotal = parseFrenchAmount(recap.totalLiberated.replace(/€/g, ''))
    || subscribers.reduce((sum, row) => sum + parseFrenchAmount(String(row.liberationAmount).replace(/€/g, '')), 0)
    || 1500;
  const depositAmountLabel = `${formatFrInteger(depositTotal)} €`;
  const depositDeposited = Boolean(
    savedFields.depositDeposited ?? hasCapitalDepositAttestation(documents),
  );

  const signatureTitle = ['SARL', 'EURL', 'SCI'].includes(legalForm) ? 'Le Gérant' : 'Le Président';
  const signature = resolveDocumentSignature({
    associates: sortedAssociates,
    fallbackName: data.president || data.director || subscribers[0]?.fullName || signatureTitle,
    fallbackTitle: signatureTitle,
  });
  const singleSubscriber = subscribers.length <= 1 || legalForm === 'SASU' || legalForm === 'EURL';
  const securitiesWord = securitiesSubscriptionPhrase(securitiesUnit);
  const signatoryTitleLabel = signature.signatoryTitle || signatureTitle;
  const signatureBlockHeading = ['SARL', 'EURL', 'SCI'].includes(legalForm)
    ? 'SIGNATURE DU GÉRANT'
    : 'SIGNATURE DU PRÉSIDENT DÉSIGNÉ';
  const signatureReminder = ['SARL', 'EURL', 'SCI'].includes(legalForm)
    ? "Le gérant est tenu de conserver les justificatifs des apports et de leur libération pendant la durée légale."
    : "Le président désigné est tenu de conserver les justificatifs des apports et de leur libération pendant la durée légale.";

  const seatLine = [data.seat?.address, [data.seat?.postalCode, data.seat?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  const initial = {
    legalFormHeader: LEGAL_FORM_SUBTITLE[legalForm] || `${LEGAL_FORM_LABELS[legalForm] || legalForm} en formation`,
    companyName: String(data.denomination || dossier?.companyName || '').trim(),
    companyLegalFormLabel: LEGAL_FORM_LABELS[legalForm] || legalForm,
    companyCapital: formatCapitalDisplay(data.capital),
    companyRegisteredOffice: seatLine || 'Siège social à compléter',
    companyFormationStatus: 'Société en cours de constitution',
    presidentDesignated: String(data.president || data.director || signature.signatoryName || '').trim(),
    officerDesignationLabel: ['SARL', 'EURL', 'SCI'].includes(legalForm) ? 'Gérant désigné' : 'Président désigné',
    introParagraph: `Le présent état récapitule les souscriptions ${securitiesWord} effectuées dans le cadre de la constitution de la société désignée ci-dessus.`,
    securitiesUnit,
    subscribers,
    singleSubscriber,
    recap,
    depositAmount: formatFrInteger(depositTotal) || '1 500',
    depositDeposited,
    depositParagraph: buildDepositParagraph(depositAmountLabel, depositDeposited),
    certificationParagraph: buildCertificationParagraph({
      securitiesUnit,
      signatoryTitle: signatoryTitleLabel,
      singleSubscriber,
    }),
    statementCity: String(questionnaire.registeredOfficeCity || questionnaire.villeSiege || data.seat?.city || 'Ville').trim(),
    statementDate: new Date().toISOString().slice(0, 10),
    presidentName: signature.presidentName,
    presidentSignatureLabel: signature.signatoryTitle,
    signatureFullName: signature.signatoryName,
    signatureBlockHeading,
    signatureReminder,
    signatureIsLegalEntity: signature.isLegalEntity,
    signatureCompanyName: signature.companyName || '',
    signatureRepresentativeName: signature.representativeName || '',
    signatureRepresentativeQuality: signature.representativeQuality || '',
    signatureLines: signature.signatureLines || [],
    signerEmail: user?.email || '',
  };

  return {
    ...initial,
    ...savedFields,
    companyCapital: formatCapitalDisplay(savedFields.companyCapital || initial.companyCapital),
    introParagraph: usesObsoleteSubscribersBoilerplate(savedFields.introParagraph)
      ? initial.introParagraph
      : (savedFields.introParagraph || initial.introParagraph),
    subscribers: Array.isArray(savedFields.subscribers) && savedFields.subscribers.length
      ? savedFields.subscribers.map((row) => enrichSubscriberContributions(row, securitiesUnit))
      : initial.subscribers,
    recap: savedFields.recap || initial.recap,
    depositParagraph: usesObsoleteSubscribersBoilerplate(savedFields.depositParagraph)
      ? initial.depositParagraph
      : (savedFields.depositParagraph || initial.depositParagraph),
    certificationParagraph: usesObsoleteSubscribersBoilerplate(savedFields.certificationParagraph)
      ? initial.certificationParagraph
      : (savedFields.certificationParagraph || initial.certificationParagraph),
    signatureReminder: usesObsoleteSubscribersBoilerplate(savedFields.signatureReminder)
      ? initial.signatureReminder
      : (savedFields.signatureReminder || initial.signatureReminder),
  };
};

export const validateSubscribersListFields = (fields = {}) => {
  const companyName = String(fields.companyName || '').trim();
  const subscribers = Array.isArray(fields.subscribers) ? fields.subscribers : [];
  if (!companyName) return { ok: false, error: 'DOCUMENT_EDITOR_COMPANY_REQUIRED' };
  if (!subscribers.length) return { ok: false, error: 'DOCUMENT_EDITOR_SUBSCRIBERS_REQUIRED' };
  if (subscribers.some((row) => !String(row.fullName || '').trim())) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SUBSCRIBER_IDENTITY_REQUIRED' };
  }
  if (subscribers.some((row) => row.isLegalEntity && !String(row.legalRepresentativeName || '').trim())) {
    return { ok: false, error: 'DOCUMENT_EDITOR_LEGAL_ENTITY_REPRESENTATIVE_REQUIRED' };
  }
  if (subscribers.some((row) => !row.isLegalEntity && !String(row.birthDatePlace || '').trim())) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SUBSCRIBER_BIRTH_REQUIRED' };
  }
  if (!String(fields.statementCity || '').trim() || !String(fields.statementDate || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED' };
  }
  if (!String(fields.presidentName || fields.signatureFullName || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  if (fields.signatureIsLegalEntity && !String(fields.signatureRepresentativeName || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_LEGAL_ENTITY_REPRESENTATIVE_REQUIRED' };
  }
  const pmValidation = validateLegalEntityParties(
    subscribers.filter((row) => row.isLegalEntity).map((row) => ({
      associateType: 'personne_morale',
      companyName: row.fullName,
      representativeName: row.legalRepresentativeName,
    })),
  );
  if (!pmValidation.ok) {
    return { ok: false, error: 'DOCUMENT_EDITOR_LEGAL_ENTITY_REPRESENTATIVE_REQUIRED' };
  }
  return { ok: true, normalized: fields };
};
