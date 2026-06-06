import { mapStatutesData } from '../../utils/statutesDataMapper.js';
import { buildPowersAnnexe } from '../../legal/statutes/shared/annexes.js';

export const buildFormalityPowersFields = ({ dossier, questionnaire = {}, user = null, savedFields = {} } = {}) => {
  const data = mapStatutesData({ dossier, questionnaire, user });
  const annex = buildPowersAnnexe(data);
  const presidentName = String(data.president || data.associates?.[0]?.label || '').trim()
    || [questionnaire.firstName, questionnaire.lastName].filter(Boolean).join(' ').trim();

  const initial = {
    title: 'POUVOIRS POUR FORMALITÉS',
    annexTitle: annex.title,
    companyName: String(data.denomination || dossier?.companyName || '').trim(),
    legalForm: String(data.legalForm || dossier?.legalForm || 'SAS').toUpperCase(),
    mandataire: String(data.mandataire || 'WILLIAM ESTABLISHMENTS / Greffio').trim(),
    greffe: String(data.greffe || 'greffe compétent').trim(),
    paragraphs: annex.paragraphs || [],
    statementCity: String(questionnaire.registeredOfficeCity || questionnaire.villeSiege || data.seat?.city || 'Ville').trim(),
    statementDate: new Date().toISOString().slice(0, 10),
    signatoryName: presidentName,
    signatoryTitle: ['SARL', 'EURL', 'SCI'].includes(String(data.legalForm || '').toUpperCase()) ? 'Le Gérant' : 'Le Président',
    signatureFullName: presidentName,
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
  if (!String(fields.signatoryName || fields.signatureFullName || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  return { ok: true, normalized: fields };
};
