import { LEGAL_FORM_LABELS, usesActions } from '../../legal/statutes/shared/formatting.js';
import { mapStatutesData } from '../../utils/statutesDataMapper.js';
import { parseFrenchAmount, formatFrInteger } from '../../statuts/shared/numberFormat.js';

const LEGAL_FORM_HEADER = Object.freeze({
  SAS: 'SOCIÉTÉ PAR ACTIONS SIMPLIFIÉE (SAS)',
  SASU: 'SOCIÉTÉ PAR ACTIONS SIMPLIFIÉE UNIPERSONNELLE (SASU)',
  SARL: 'SOCIÉTÉ À RESPONSABILITÉ LIMITÉE (SARL)',
  EURL: 'ENTREPRISE UNIPERSONNELLE À RESPONSABILITÉ LIMITÉE (EURL)',
  SCI: 'SOCIÉTÉ CIVILE IMMOBILIERE (SCI)',
});

const formatBirthDateFr = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
};

const buildObservations = (associate = {}) => {
  if (associate.isMinorEmancipated) return 'Mineur émancipé';
  if (associate.isMinor) {
    const reps = String(associate.legalRepresentatives || '').trim();
    if (reps) {
      return `Mineure non émancipée, représentée légalement par ${reps} agissant en qualité de titulaires de l'autorité parentale.`;
    }
    return 'Mineure non émancipée, représentée légalement par les titulaires de l\'autorité parentale.';
  }
  return 'Majeur';
};

const mapSubscriberRow = (associate = {}, { securitiesUnit = 'Actions' }) => {
  const fullName = String(associate.label || '').trim()
    || [associate.firstName, associate.lastName].filter(Boolean).join(' ').trim();
  const roleTitle = String(associate.roleLabel || 'Associé').trim();
  const birthDate = formatBirthDateFr(associate.birthDate);
  const birthPlace = String(associate.birthPlace || '').trim();
  const birthDatePlace = [birthDate, birthPlace ? `à ${birthPlace}` : ''].filter(Boolean).join(' ').trim();
  const cashFormatted = associate.contributionCash
    ? `${associate.contributionCash}`.replace(/(?<=\d)\s?(?=€)/, ' ')
    : '0 €';
  const cashNum = parseFrenchAmount(cashFormatted.replace('€', '')) || 0;
  const shares = parseFrenchAmount(String(associate.titlesCount || '0')) || 0;
  const inKindRaw = parseFrenchAmount(String(associate.contributionInKind || '').replace('€', ''));
  const inKindComputed = inKindRaw || Math.max(0, shares - cashNum);
  const contributionInKind = inKindComputed ? `${formatFrInteger(inKindComputed)} €` : '0 €';

  return {
    roleTitle,
    fullName,
    sectionHeading: `${roleTitle} – ${fullName}`,
    birthDatePlace: birthDatePlace || 'À compléter',
    nationality: String(associate.nationality || 'Française').trim(),
    address: String(associate.address || 'Adresse à compléter').trim(),
    titlesCount: String(associate.titlesCount || associate.share || '0').replace(/\s/g, ' ').trim(),
    sharePercent: String(associate.share || '').trim() || '—',
    contributionCash: cashFormatted,
    contributionInKind,
    liberationAmount: associate.liberationAmount ? `${associate.liberationAmount}`.replace(/(?<=\d)\s?(?=€)/, ' ') : '0 €',
    observations: buildObservations(associate),
    securitiesUnit,
  };
};

export const buildSubscribersListFields = ({ dossier, questionnaire = {}, user = null, savedFields = {} } = {}) => {
  const data = mapStatutesData({ dossier, questionnaire, user });
  const legalForm = String(data.legalForm || 'SAS').toUpperCase();
  const securitiesUnit = usesActions(legalForm) ? 'Actions' : 'Parts sociales';
  const subscribers = (data.associates || []).map((associate) => mapSubscriberRow(associate, { securitiesUnit }));

  const depositTotal = subscribers.reduce((sum, row) => {
    const cash = parseFrenchAmount(String(row.contributionCash || '').replace('€', ''));
    const liberationPct = 0.5;
    return sum + Math.round(cash * liberationPct);
  }, 0) || parseFrenchAmount(data.liberationCapital) || 1500;

  const presidentAssoc = (data.associates || []).find((a) => /président/i.test(String(a.roleLabel || '')))
    || data.associates?.[0];
  const presidentName = presidentAssoc?.label
    || data.president
    || subscribers[0]?.fullName
    || 'Le Président';

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
    presidentName,
    presidentSignatureLabel: 'Le Président',
    signatureFullName: presidentName,
    signerEmail: user?.email || '',
  };

  if (legalForm.includes('SARL') || legalForm === 'EURL' || legalForm === 'SCI') {
    initial.certificationParagraph = initial.certificationParagraph
      .replace(/actions/g, 'parts sociales')
      .replace(/Président/g, 'Gérant');
    initial.presidentSignatureLabel = 'Le Gérant';
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
  if (!String(fields.statementCity || '').trim() || !String(fields.statementDate || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_PLACE_DATE_REQUIRED' };
  }
  if (!String(fields.presidentName || fields.signatureFullName || '').trim()) {
    return { ok: false, error: 'DOCUMENT_EDITOR_SIGNATURE_REQUIRED' };
  }
  return { ok: true, normalized: fields };
};
