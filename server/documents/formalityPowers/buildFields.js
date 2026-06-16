import { mapStatutesData } from '../../utils/statutesDataMapper.js';
import { buildPowersAnnexe } from '../../legal/statutes/shared/annexes.js';
import { resolveDocumentSignature } from '../../shared/partyIdentityFormatter.js';

export const buildFormalityPowersFields = ({ dossier, questionnaire = {}, user = null, savedFields = {} } = {}) => {
  const data = mapStatutesData({ dossier, questionnaire, user });
  const annex = buildPowersAnnexe(data);
  const signatureTitle = ['SARL', 'EURL', 'SCI'].includes(String(data.legalForm || '').toUpperCase())
    ? 'Le Gérant'
    : 'Le Président';
  const signature = resolveDocumentSignature({
    associates: data.associates || [],
    fallbackName: String(data.president || '').trim()
      || [questionnaire.firstName, questionnaire.lastName].filter(Boolean).join(' ').trim(),
    fallbackTitle: signatureTitle,
  });
  const clientFullName = [questionnaire.firstName, questionnaire.lastName].filter(Boolean).join(' ').trim()
    || signature.signatoryName
    || user?.name
    || '';
  const clientAddress = [
    questionnaire.adressePersonnelle,
    questionnaire.addressLine1,
    questionnaire.addressLine2,
    [questionnaire.postalCode, questionnaire.city].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ').trim();
  const companyRegisteredOffice = [
    questionnaire.adresseSiege,
    [questionnaire.codePostal, questionnaire.villeSiege].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ').trim();

  const initial = {
    title: 'POUVOIRS POUR FORMALITÉS ET PROCURATION DU CLIENT',
    annexTitle: annex.title,
    companyName: String(data.denomination || dossier?.companyName || '').trim(),
    legalForm: String(data.legalForm || dossier?.legalForm || 'SAS').toUpperCase(),
    mandataire: String(data.mandataire || 'WILLIAM ESTABLISHMENTS').trim(),
    greffe: String(data.greffe || 'greffe compétent').trim(),
    clientFullName,
    clientBirthDate: String(questionnaire.birthDate || questionnaire.dateNaissance || '').trim(),
    clientBirthPlace: String(questionnaire.birthPlace || questionnaire.lieuNaissance || '').trim(),
    clientAddress,
    companyRegisteredOffice,
    companySirenOrSiret: String(questionnaire.existingBusinessSiren || questionnaire.companySiren || dossier?.siren || '').trim(),
    paragraphs: annex.paragraphs || [],
    statementCity: String(questionnaire.registeredOfficeCity || questionnaire.villeSiege || data.seat?.city || 'Ville').trim(),
    statementDate: new Date().toISOString().slice(0, 10),
    signatoryName: signature.signatoryName,
    signatoryTitle: signature.signatoryTitle,
    signatureFullName: signature.signatoryName,
    signatureIsLegalEntity: signature.isLegalEntity,
    signatureCompanyName: signature.companyName || '',
    signatureRepresentativeName: signature.representativeName || '',
    signatureRepresentativeQuality: signature.representativeQuality || '',
    signatureLines: signature.signatureLines || [],
    signerEmail: user?.email || '',
  };

  return { ...initial, ...savedFields };
};

export const validateFormalityPowersFields = (fields = {}) => {
  if (!String(fields.companyName || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_COMPANY_REQUIRED' };
  }
  if (!String(fields.mandataire || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_MANDATAIRE_REQUIRED' };
  }
  if (!String(fields.statementCity || '').trim() || !String(fields.statementDate || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED' };
  }
  if (!String(fields.clientFullName || fields.signatoryName || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  if (!String(fields.clientAddress || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_ADDRESS_REQUIRED' };
  }
  if (fields.signatureIsLegalEntity && !String(fields.signatureRepresentativeName || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_LEGAL_ENTITY_REPRESENTATIVE_REQUIRED' };
  }
  return { ok: true, normalized: fields };
};
