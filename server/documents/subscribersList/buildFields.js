import { LEGAL_FORM_LABELS, usesActions } from '../../legal/statutes/shared/formatting.js';
import { mapStatutesData } from '../../utils/statutesDataMapper.js';
import { parseFrenchAmount, formatFrInteger } from '../../statuts/shared/numberFormat.js';
import {
  formatSubscriberListRow,
  resolveDocumentSignature,
  sortAssociatesPresidentFirst,
  validateLegalEntityParties,
} from '../../shared/partyIdentityFormatter.js';

const LEGAL_FORM_HEADER = Object.freeze({
  SAS: 'SOCIÉTÉ PAR ACTIONS SIMPLIFIÉE (SAS)',
  SASU: 'SOCIÉTÉ PAR ACTIONS SIMPLIFIÉE UNIPERSONNELLE (SASU)',
  SARL: 'SOCIÉTÉ À RESPONSABILITÉ LIMITÉE (SARL)',
  EURL: 'ENTREPRISE UNIPERSONNELLE À RESPONSABILITÉ LIMITÉE (EURL)',
  SCI: 'SOCIÉTÉ CIVILE IMMOBILIERE (SCI)',
});

const enrichSubscriberContributions = (row = {}) => {
  const cashFormatted = row.contributionCash || '0 €';
  const cashNum = parseFrenchAmount(String(cashFormatted).replace('€', '')) || 0;
  const shares = parseFrenchAmount(String(row.titlesCount || '0')) || 0;
  const inKindRaw = parseFrenchAmount(String(row.contributionInKind || '').replace('€', ''));
  const inKindComputed = inKindRaw || Math.max(0, shares - cashNum);
  return {
    ...row,
    contributionInKind: inKindComputed ? `${formatFrInteger(inKindComputed)} €` : '0 €',
  };
};

export const buildSubscribersListFields = ({ dossier, questionnaire = {}, user = null, savedFields = {} } = {}) => {
  const data = mapStatutesData({ dossier, questionnaire, user });
  const legalForm = String(data.legalForm || 'SAS').toUpperCase();
  const securitiesUnit = usesActions(legalForm) ? 'Actions' : 'Parts sociales';
  const sortedAssociates = sortAssociatesPresidentFirst(data.associates || []);
  const subscribers = sortedAssociates.map((associate) => enrichSubscriberContributions(formatSubscriberListRow(associate, {
    securitiesUnit,
    companyCapital: data.capital,
  })));

  const depositTotal = subscribers.reduce((sum, row) => {
    const cash = parseFrenchAmount(String(row.contributionCash || '').replace('€', ''));
    const liberationPct = 0.5;
    return sum + Math.round(cash * liberationPct);
  }, 0) || parseFrenchAmount(data.liberationCapital) || 1500;

  const signatureTitle = ['SARL', 'EURL', 'SCI'].includes(legalForm) ? 'Le Gérant' : 'Le Président';
  const signature = resolveDocumentSignature({
    associates: sortedAssociates,
    fallbackName: data.president || subscribers[0]?.fullName || 'Le Président',
    fallbackTitle: signatureTitle,
  });

  const initial = {
    legalFormHeader: LEGAL_FORM_HEADER[legalForm] || LEGAL_FORM_LABELS[legalForm]?.toUpperCase() || legalForm,
    companyName: String(data.denomination || dossier?.companyName || '').trim(),
    securitiesUnit,
    subscribers,
    depositAmount: formatFrInteger(depositTotal) || '1 500',
    depositParagraph: `La somme de ${formatFrInteger(depositTotal) || '1 500'} euros, correspondant aux apports en numéraire libérés à la constitution est déposée sur un compte ouvert au nom de la société en formation, attesté par le dépositaire.`,
    certificationParagraph: 'Le présent état, qui constate la souscription des actions et le versement de la moitié du nominal desdites actions, est certifié exact, sincère et véritable par le Président.',
    statementCity: String(questionnaire.registeredOfficeCity || questionnaire.villeSiege || data.seat?.city || 'Ville').trim(),
    statementDate: new Date().toISOString().slice(0, 10),
    presidentName: signature.presidentName,
    presidentSignatureLabel: signature.signatoryTitle,
    signatureFullName: signature.signatoryName,
    signatureIsLegalEntity: signature.isLegalEntity,
    signatureCompanyName: signature.companyName || '',
    signatureRepresentativeName: signature.representativeName || '',
    signatureRepresentativeQuality: signature.representativeQuality || '',
    signatureLines: signature.signatureLines || [],
    signerEmail: user?.email || '',
  };

  if (legalForm.includes('SARL') || legalForm === 'EURL' || legalForm === 'SCI') {
    initial.certificationParagraph = initial.certificationParagraph
      .replace(/actions/g, 'parts sociales')
      .replace(/Président/g, 'Gérant');
  }

  return {
    ...initial,
    ...savedFields,
    subscribers: Array.isArray(savedFields.subscribers) && savedFields.subscribers.length
      ? savedFields.subscribers
      : initial.subscribers,
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
