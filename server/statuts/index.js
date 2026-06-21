import { usesActions, resolveLegalFormLabel } from '../legal/statutes/shared/formatting.js';
import { buildWilliamDocumentByForm } from '../legal/statutes/reference/williamAdaptations.js';
import { mapStatutesDataToRenderContext } from './mappers/mapStatutesDataToRenderContext.js';
import { renderWilliamSas2026Blocks } from './renderers/renderWilliamSas2026.js';
import { applySasuAdaptationsToBlocks } from './adapters/sasuAdaptations.js';
import { adaptRenderedBlocksToLegacyDocument } from './adapters/adaptToLegacyDocument.js';
import { validateGeneratedStatutsText } from './shared/deriveStatutsCapital.js';
import { assertValidGeneratedStatuts } from './validators/validateGeneratedStatuts.js';

const CANON_FORMS = new Set(['SAS', 'SASU']);

export const generateStatutesDocument = (statutesData = {}) => {
  const legalForm = String(statutesData.legalForm || 'SAS').toUpperCase();

  if (!usesActions(legalForm) || !CANON_FORMS.has(legalForm)) {
    return buildWilliamDocumentByForm(statutesData);
  }

  const context = mapStatutesDataToRenderContext(statutesData);
  let blocks = renderWilliamSas2026Blocks(context);

  if (legalForm === 'SASU') {
    blocks = applySasuAdaptationsToBlocks(blocks);
    context.company.legalFormLabel = resolveLegalFormLabel('SASU', { withAcronym: true });
  }

  const validation = assertValidGeneratedStatuts({ blocks, context, legalForm });

  const document = adaptRenderedBlocksToLegacyDocument({
    blocks,
    statutesData,
    templateId: 'william-establishments-sas-2026',
  });

  const generatedText = [
    ...(document.blocks || []).map((block) => block.body || block.text || ''),
    ...(document.annexes || []).flatMap((annexe) => [
      ...(annexe.paragraphs || []),
      ...((annexe.table?.rows || []).flat()),
    ]),
  ].join('\n');
  const textValidation = validateGeneratedStatutsText(generatedText, context.capitalModel);
  if (!textValidation.ok) {
    const error = new Error('STATUTES_TEXT_VALIDATION_FAILED');
    error.code = 'STATUTES_TEXT_VALIDATION_FAILED';
    error.validation = { errors: textValidation.errors };
    throw error;
  }

  return {
    ...document,
    metadata: {
      ...document.metadata,
      ...validation,
      validationErrors: [],
    },
  };
};

export { mapStatutesDataToRenderContext } from './mappers/mapStatutesDataToRenderContext.js';
export { mapQuestionnaireToStatutsData, mapStatutesDataFromSimulator } from './mappers/mapQuestionnaireToStatutsData.js';
