import { isStatutesSupportedForm, documentToPreview } from '../legal/statutes/index.js';
import { mapStatutesDataFromSimulator } from '../utils/statutesDataMapper.js';
import { draftStatutesDocument } from './statutesDrafting.js';

export const buildSimulatorStatutesPreview = ({ data = {}, answers = {} } = {}) => {
  const legalForm = String(
    answers.formeJuridique || data.legalForm || data.formeJuridique || 'SASU',
  ).toUpperCase();

  if (!isStatutesSupportedForm(legalForm)) {
    const error = new Error('LEGAL_FORM_UNSUPPORTED');
    error.code = 'LEGAL_FORM_UNSUPPORTED';
    error.legalForm = legalForm;
    throw error;
  }

  const statutesData = mapStatutesDataFromSimulator({ data, answers });
  const document = draftStatutesDocument(statutesData);
  const preview = documentToPreview(document);

  return {
    legalForm,
    statutesData,
    document,
    preview: {
      ...preview,
      metadata: {
        ...preview.metadata,
        checks: statutesData.checks,
        completeness: statutesData.completeness,
        missingFields: statutesData.missingFields,
      },
      incorporatedData: {
        denomination: statutesData.denomination,
        legalForm: statutesData.legalForm,
        objetSocial: statutesData.objetSocial,
        siege: statutesData.seat.full,
        capital: statutesData.capital,
        repartition: statutesData.repartition,
        director: statutesData.director,
        directorRole: statutesData.directorRole,
        beneficiairesEffectifs: statutesData.beneficiairesEffectifs,
        associates: statutesData.associates,
      },
    },
  };
};
