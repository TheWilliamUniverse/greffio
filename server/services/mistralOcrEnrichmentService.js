import { isMistralOcrConfigured, extractText } from '../integrations/providers/mistral/mistralOcrAdapter.js';
import { DOCUMENT_STATUSES } from '../domain/documentStatus.js';

const OCR_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/**
 * Enrichit un document uploadé via Mistral OCR (async, non bloquant pour l'upload).
 */
export const scheduleMistralOcrEnrichment = ({
  dossierId,
  docKey,
  buffer,
  mimeType,
  filename,
  listDossierDocuments,
  updateDossierDocument,
}) => {
  if (!isMistralOcrConfigured()) return { scheduled: false, reason: 'DISABLED' };
  if (!buffer?.length || !OCR_MIME_TYPES.has(String(mimeType || '').toLowerCase())) {
    return { scheduled: false, reason: 'UNSUPPORTED_MIME' };
  }

  setImmediate(() => {
    void enrichDocumentWithMistralOcr({
      dossierId,
      docKey,
      buffer,
      mimeType,
      filename,
      listDossierDocuments,
      updateDossierDocument,
    });
  });

  return { scheduled: true };
};

export const enrichDocumentWithMistralOcr = async ({
  dossierId,
  docKey,
  buffer,
  mimeType,
  filename,
  listDossierDocuments,
  updateDossierDocument,
}) => {
  if (!isMistralOcrConfigured()) return { ok: false, skipped: true };

  try {
    const ocr = await extractText({ buffer, mimeType, filename });
    if (!ocr.ok) return ocr;

    const documents = await listDossierDocuments(dossierId);
    const existing = documents.find((item) => item.docKey === docKey);
    if (!existing) return { ok: false, error: 'DOCUMENT_NOT_FOUND' };

    const previousAnalysis = existing.metadata?.analysis || {};
    const mergedAnalysis = {
      ...previousAnalysis,
      mistralOcr: {
        provider: ocr.provider,
        model: ocr.model,
        pageCount: ocr.pageCount,
        confidenceScore: ocr.confidenceScore,
        requiresManualReview: ocr.requiresManualReview,
        extractedTextPreview: ocr.text.slice(0, 3500),
        completedAt: new Date().toISOString(),
      },
      confidence: Math.max(Number(previousAnalysis.confidence || 0), ocr.confidenceScore),
      requiresManualReview: Boolean(previousAnalysis.requiresManualReview || ocr.requiresManualReview),
    };

    const nextStatus = mergedAnalysis.requiresManualReview
      && existing.status === DOCUMENT_STATUSES.UPLOADED
      ? DOCUMENT_STATUSES.UNDER_REVIEW
      : existing.status;

    await updateDossierDocument({
      dossierId,
      docKey,
      status: nextStatus,
      metadata: {
        ...(existing.metadata || {}),
        analysis: mergedAnalysis,
      },
    });

    return { ok: true, confidenceScore: ocr.confidenceScore, requiresManualReview: ocr.requiresManualReview };
  } catch (error) {
    console.error('[mistralOcrEnrichment]', {
      dossierId,
      docKey,
      message: error?.message || String(error),
    });
    return { ok: false, error: error?.message || 'MISTRAL_OCR_ENRICHMENT_FAILED' };
  }
};
