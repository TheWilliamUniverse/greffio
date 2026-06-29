import { mapStatutesData } from '../utils/statutesDataMapper.js';

const STATUTES_DATA_ERROR_CODES = new Set([
  'STATUTES_VALIDATION_FAILED',
  'STATUTES_CAPITAL_INCONSISTENT',
  'STATUTES_TEXT_VALIDATION_FAILED',
]);

export const buildStatutesErrorPayload = (error, { dossier, questionnaire, user } = {}) => {
  const statutesData = mapStatutesData({ dossier, questionnaire, user });
  const validation = error?.validation || null;
  const missingFields = statutesData.missingFields || [];
  const message = String(error?.message || '').trim();

  if (error?.code === 'STATUTES_INCOMPLETE') {
    return {
      status: 500,
      body: {
        ok: false,
        error: 'STATUTES_INCOMPLETE',
        articleCount: error.articleCount,
        missingFields,
        completeness: statutesData.completeness,
      },
    };
  }

  if (STATUTES_DATA_ERROR_CODES.has(error?.code)) {
    return {
      status: 422,
      body: {
        ok: false,
        error: error.code,
        message,
        validation,
        missingFields,
        completeness: statutesData.completeness,
      },
    };
  }

  if (error?.code === 'LEGAL_FORM_UNSUPPORTED') {
    return {
      status: 409,
      body: {
        ok: false,
        error: 'LEGAL_FORM_UNSUPPORTED',
        legalForm: error.legalForm,
        message,
      },
    };
  }

  if (String(error?.message || '').includes('Unsupported legal form for statutes generation')) {
    return {
      status: 409,
      body: {
        ok: false,
        error: 'LEGAL_FORM_UNSUPPORTED',
        message,
      },
    };
  }

  return null;
};
