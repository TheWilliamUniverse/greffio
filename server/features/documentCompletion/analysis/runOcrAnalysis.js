import { randomUUID } from 'node:crypto';
import { documentCompletionConfig } from '../config.js';
import { matchAdministrativeKeyword } from '../frenchAdministrativeKeywords.js';

let tesseractModulePromise = null;
let pdfToImgPromise = null;

const loadTesseract = async () => {
  if (!tesseractModulePromise) {
    tesseractModulePromise = import('tesseract.js').catch(() => null);
  }
  return tesseractModulePromise;
};

const loadPdfToImg = async () => {
  if (!pdfToImgPromise) {
    pdfToImgPromise = import('pdf-to-img').catch(() => null);
  }
  return pdfToImgPromise;
};

const mapOcrBlockToCandidate = ({ pageIndex, pageNumber, pageWidth, pageHeight, block }) => {
  const admin = matchAdministrativeKeyword(block.text);
  const type = admin?.type || 'text';
  const size = type === 'signature'
    ? { width: 200, height: 44 }
    : { width: Math.min(240, pageWidth * 0.4), height: 18 };
  return {
    id: randomUUID(),
    pageIndex,
    pageNumber,
    type,
    label: admin?.matchedLabel || block.text.slice(0, 40),
    placeholder: admin?.matchedLabel || block.text.slice(0, 40),
    bbox: {
      x: block.bbox.x,
      y: pageHeight - block.bbox.y - size.height,
      width: size.width,
      height: size.height,
      coordinateSystem: 'pdf_points',
    },
    detection: {
      source: 'ocr_text_block',
      confidence: Math.max(0.45, Math.min(0.82, block.confidence / 100)),
      reason: 'Bloc OCR avec libellé administratif probable',
      matchedText: block.text,
      ocrConfidence: block.confidence,
    },
    semantic: admin ? { category: admin.category, normalizedKey: admin.normalizedKey } : { category: 'unknown' },
  };
};

export const runOcrAnalysis = async ({ pdfBytes, pageCount = 1, requiresOcr = false }) => {
  const warnings = [];
  if (!documentCompletionConfig.enableOcr) {
    return { provider: 'none', pages: [], averageConfidence: 0, warnings, candidates: [] };
  }

  const pdfToImg = await loadPdfToImg();
  const tesseract = await loadTesseract();
  if (!pdfToImg?.pdf || !tesseract?.createWorker) {
    warnings.push({
      code: requiresOcr ? 'OCR_LOW_CONFIDENCE' : 'PARTIAL_ANALYSIS',
      message: 'OCR indisponible sur ce serveur. Analyse basée sur la couche texte et les règles.',
      severity: requiresOcr ? 'warning' : 'info',
    });
    return { provider: 'none', pages: [], averageConfidence: 0, warnings, candidates: [] };
  }

  try {
    const worker = await tesseract.createWorker('fra', 1, { logger: () => {} });
    const pages = [];
    const candidates = [];
    let confidenceSum = 0;
    let confidenceCount = 0;
    const maxPages = Math.min(pageCount || 1, 8);
    const document = await pdfToImg.pdf(pdfBytes, { scale: 2 });

    let pageIndex = 0;
    for await (const image of document) {
      if (pageIndex >= maxPages) break;
      const { data } = await worker.recognize(image);
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const scaleX = pageWidth / (data.image?.width || pageWidth * 2);
      const scaleY = pageHeight / (data.image?.height || pageHeight * 2);
      const blocks = (data.words || []).map((word, idx) => ({
        id: `ocr-${pageIndex}-${idx}`,
        text: String(word.text || '').trim(),
        confidence: Number(word.confidence || 0),
        bbox: {
          x: Number(word.bbox?.x0 || 0) * scaleX,
          y: Number(word.bbox?.y0 || 0) * scaleY,
          width: Math.max(12, (Number(word.bbox?.x1 || 0) - Number(word.bbox?.x0 || 0)) * scaleX),
          height: Math.max(10, (Number(word.bbox?.y1 || 0) - Number(word.bbox?.y0 || 0)) * scaleY),
        },
      })).filter((block) => block.text.length >= 2);

      for (const block of blocks) {
        confidenceSum += block.confidence;
        confidenceCount += 1;
        const admin = matchAdministrativeKeyword(block.text);
        if (admin || /_{2,}|[:：]/.test(block.text)) {
          candidates.push(mapOcrBlockToCandidate({
            pageIndex,
            pageNumber: pageIndex + 1,
            pageWidth,
            pageHeight,
            block,
          }));
        }
      }

      pages.push({
        pageIndex,
        width: pageWidth,
        height: pageHeight,
        blocks,
      });
      pageIndex += 1;
    }

    await worker.terminate();
    const averageConfidence = confidenceCount ? confidenceSum / confidenceCount : 0;
    if (requiresOcr && averageConfidence < 55) {
      warnings.push({
        code: 'OCR_LOW_CONFIDENCE',
        message: 'La qualité OCR est faible. Certaines zones peuvent nécessiter une relecture.',
        severity: 'warning',
      });
    }

    return {
      provider: 'tesseract',
      pages,
      averageConfidence,
      warnings,
      candidates,
    };
  } catch (error) {
    warnings.push({
      code: 'OCR_FAILED',
      message: 'OCR impossible sur ce document. Analyse partielle effectuée.',
      severity: 'warning',
    });
    return { provider: 'tesseract', pages: [], averageConfidence: 0, warnings, candidates: [] };
  }
};
