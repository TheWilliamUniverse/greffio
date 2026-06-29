import { QUESTIONNAIRE_NEW_PATH, questionnaireResumePath } from '@/utils/questionnaireNavigation.js';

const DATA_ERROR_CODES = new Set([
  'STATUTES_VALIDATION_FAILED',
  'STATUTES_CAPITAL_INCONSISTENT',
  'STATUTES_TEXT_VALIDATION_FAILED',
]);

const formatLiberationClientHint = (message = '') => {
  const text = String(message || '');
  if (!/libération incohérente/i.test(text)) return null;
  return 'Ouvrez le questionnaire → étape « Libération du capital » et vérifiez le montant libéré par associé (il doit correspondre au % appliqué à sa part de capital en numéraire).';
};

export const resolveStatutesGenerationToast = (error, _dossierId) => {
  const code = error?.payload?.error;
  const validationErrors = error?.payload?.validation?.errors;
  const missingFields = Array.isArray(error?.payload?.missingFields)
    ? error.payload.missingFields.filter(Boolean)
    : [];
  const serverMessage = String(error?.payload?.message || '').trim();

  if (code === 'STATUTES_NOT_REQUIRED_FOR_EI') {
    return { message: 'Statuts non applicables à ce dossier.', showQuestionnaireLink: false };
  }
  if (code === 'DOSSIER_FORBIDDEN' || code === 'DOSSIER_NOT_FOUND') {
    return { message: 'Dossier inaccessible. Ouvrez le questionnaire puis revenez ici.', showQuestionnaireLink: true };
  }
  if (DATA_ERROR_CODES.has(code)) {
    const detail = validationErrors?.[0]
      || missingFields.join(', ')
      || serverMessage;
    const liberationHint = formatLiberationClientHint(detail || serverMessage);
    return {
      message: detail
        ? `Génération bloquée : ${detail}`
        : 'Données incomplètes : complétez le questionnaire puis réessayez.',
      hint: liberationHint,
      showQuestionnaireLink: true,
      missingFields,
    };
  }
  if (code === 'STATUTES_INCOMPLETE') {
    return { message: 'Le modèle de statuts est incomplet. Contactez le support Greffio.', showQuestionnaireLink: false };
  }
  if (code === 'LEGAL_FORM_UNSUPPORTED') {
    return { message: 'Forme juridique non prise en charge pour la génération automatique.', showQuestionnaireLink: false };
  }
  if (code === 'STATUTES_PDF_FAILED') {
    return {
      message: serverMessage || 'Échec de la génération PDF. Réessayez ou contactez le support.',
      showQuestionnaireLink: false,
    };
  }
  if (serverMessage && !['API_ERROR', 'STATUTES_PDF_FAILED'].includes(serverMessage)) {
    return { message: serverMessage, showQuestionnaireLink: DATA_ERROR_CODES.has(code) };
  }
  return { message: 'Génération impossible. Vérifiez le questionnaire puis réessayez.', showQuestionnaireLink: true };
};

export const statutesQuestionnaireHref = (dossierId) => (
  dossierId ? questionnaireResumePath(dossierId) : QUESTIONNAIRE_NEW_PATH
);
