import { parsePdfDocument, buildTextLayerBlocks } from './parsePdfDocument.js';
import { detectExistingPdfFields } from './detectExistingPdfFields.js';
import { detectTextBasedFields } from './detectTextBasedFields.js';
import { detectGridFormFields } from './detectGridFormFields.js';
import { normalizeFieldBbox } from './bboxHelpers.js';
import { runOcrAnalysis } from './runOcrAnalysis.js';
import { runAiFieldDetection } from './runAiFieldDetection.js';
import { buildAnalysisSummary, mergeAndDeduplicateCandidates } from './mergeAndScore.js';
import { documentCompletionConfig } from '../config.js';

export const analyzeDocumentForCompletion = async ({
  documentId,
  pdfBytes,
  fileName,
  options = {},
}) => {
  const warnings = [];
  const parsed = await parsePdfDocument(pdfBytes);

  if (parsed.isEncrypted) {
    warnings.push({
      code: 'ENCRYPTED_PDF',
      message: 'Ce PDF semble protégé. L’analyse peut être incomplète.',
      severity: 'warning',
    });
  }

  if (parsed.pageCount <= 0) {
    throw Object.assign(new Error('PDF_EMPTY'), { code: 'PDF_EMPTY' });
  }

  if (parsed.pageCount > documentCompletionConfig.maxPages) {
    throw Object.assign(new Error('PDF_TOO_LARGE'), { code: 'PDF_PARSE_FAILED' });
  }

  if (parsed.requiresOcr) {
    warnings.push({
      code: 'SCANNED_DOCUMENT',
      message: 'Document scanné ou peu textuel détecté. Greffio utilise l’OCR pour identifier les zones à compléter.',
      severity: 'info',
    });
  }

  const detectionMethodsUsed = [];
  const candidates = [];

  if (options.enableExistingPdfFieldDetection !== false && parsed.hasExistingFormFields) {
    const existing = await detectExistingPdfFields({
      pdfDoc: parsed.pdfDoc,
      pages: parsed.pages,
    });
    candidates.push(...existing);
    if (existing.length) detectionMethodsUsed.push('existing_pdf_form_field');
  }

  if (options.enableTextHeuristics !== false && parsed.hasTextLayer) {
    const textFields = detectTextBasedFields({ pages: parsed.pages });
    candidates.push(...textFields);
    const gridFields = detectGridFormFields({ pages: parsed.pages });
    candidates.push(...gridFields);
    if (textFields.length) {
      detectionMethodsUsed.push(
        'text_underscore_line',
        'text_label_after_colon',
        'text_keyword_near_empty_space',
        'text_date_pattern',
        'text_checkbox_symbol',
        'text_signature_keyword',
      );
    }
    if (gridFields.length) detectionMethodsUsed.push('text_grid_form_row');
  }

  let ocrResult = { warnings: [], candidates: [], pages: [] };
  if (options.enableOcr !== false && (parsed.requiresOcr || documentCompletionConfig.enableOcr)) {
    ocrResult = await runOcrAnalysis({
      pdfBytes: parsed.pdfBytes,
      pageCount: parsed.pageCount,
      requiresOcr: parsed.requiresOcr,
    });
    warnings.push(...(ocrResult.warnings || []));
    candidates.push(...(ocrResult.candidates || []));
    if (ocrResult.candidates?.length) detectionMethodsUsed.push('ocr_text_block');
  }

  const textLayerBlocks = buildTextLayerBlocks(parsed.pages);
  let aiResult = { fields: [], warnings: [] };
  if (options.enableAiDetection !== false) {
    aiResult = await runAiFieldDetection({
      documentId,
      fileName,
      pageCount: parsed.pageCount,
      textLayerBlocks,
      ocrBlocks: (ocrResult.pages || []).flatMap((page) => page.blocks.map((block) => ({
        pageIndex: page.pageIndex,
        text: block.text,
        bbox: block.bbox,
      }))),
      existingCandidates: candidates,
      language: 'fr',
    });
    warnings.push(...(aiResult.warnings || []));
    candidates.push(...(aiResult.fields || []));
    if (aiResult.fields?.length) detectionMethodsUsed.push('ai_structured_detection');
  }

  const fields = mergeAndDeduplicateCandidates(candidates, {
    minConfidence: options.minConfidence ?? documentCompletionConfig.minConfidence,
  })
    .map((field) => {
      const page = parsed.pages[field.pageIndex] || parsed.pages[0];
      const normalizedBbox = page
        ? normalizeFieldBbox(field.bbox, page.width, page.height)
        : null;
      if (!normalizedBbox) return null;
      return {
        ...field,
        documentId,
        bbox: normalizedBbox,
      };
    })
    .filter(Boolean);

  if (!fields.length) {
    warnings.push({
      code: 'NO_FIELDS_DETECTED',
      message: 'Aucun champ évident détecté. Vous pouvez tout de même générer un PDF ou réessayer avec un scan plus net.',
      severity: 'warning',
    });
  }

  const analysisSummary = buildAnalysisSummary(fields, detectionMethodsUsed);

  return {
    documentId,
    sourceType: parsed.sourceType,
    metadata: {
      pageCount: parsed.pageCount,
      hasTextLayer: parsed.hasTextLayer,
      hasExistingFormFields: parsed.hasExistingFormFields,
      requiresOcr: parsed.requiresOcr,
      isEncrypted: parsed.isEncrypted,
      detectedLanguages: ['fr'],
    },
    warnings,
    fields,
    analysisSummary,
    documentTypeGuess: aiResult.documentTypeGuess,
  };
};
