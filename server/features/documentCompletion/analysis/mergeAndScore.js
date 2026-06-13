import { randomUUID } from 'node:crypto';
import { documentCompletionConfig } from '../config.js';

export const confidenceLabelFromScore = (score) => {
  if (score >= 0.8) return 'high';
  if (score >= 0.62) return 'medium';
  return 'low';
};

export const scoreFieldCandidate = (candidate) => {
  let score = Number(candidate.detection?.confidence || 0.5);
  const source = candidate.detection?.source;
  if (source === 'existing_pdf_form_field') score = Math.max(score, 0.95);
  if (source === 'text_underscore_line') score = Math.max(score, 0.85);
  if (source === 'text_label_after_colon') score = Math.max(score, 0.75);
  if (source === 'text_keyword_near_empty_space') score = Math.max(score, 0.72);
  if (source === 'text_grid_form_row') score = Math.max(score, 0.8);
  if (source === 'ocr_text_block') {
    const ocr = Number(candidate.detection?.ocrConfidence || 0);
    score = Math.max(score, 0.55 + (ocr / 200));
  }
  if (source === 'ai_structured_detection') score = Math.min(score, 0.82);
  if (candidate.semantic?.normalizedKey) score += 0.04;
  score = Math.max(0, Math.min(0.99, score));
  return {
    ...candidate,
    detection: {
      ...candidate.detection,
      confidence: score,
    },
  };
};

const bboxOverlapRatio = (a, b) => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const intersection = (x2 - x1) * (y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
};

const labelSimilarity = (a, b) => {
  const left = String(a || '').toLowerCase().trim();
  const right = String(b || '').toLowerCase().trim();
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.85;
  return 0;
};

export const mergeAndDeduplicateCandidates = (candidates, options = {}) => {
  const minConfidence = options.minConfidence ?? documentCompletionConfig.minConfidence;
  const overlapThreshold = options.overlapThreshold ?? documentCompletionConfig.overlapThreshold;
  const scored = candidates.map(scoreFieldCandidate).sort((a, b) => b.detection.confidence - a.detection.confidence);
  const kept = [];

  for (const candidate of scored) {
    if (candidate.detection.confidence < minConfidence) continue;
    const duplicate = kept.find((existing) => {
      if (existing.pageIndex !== candidate.pageIndex) return false;
      const overlap = bboxOverlapRatio(existing.bbox, candidate.bbox);
      const labelScore = labelSimilarity(existing.label, candidate.label);
      return overlap >= overlapThreshold || (overlap > 0.2 && labelScore > 0.8);
    });

    if (!duplicate) {
      kept.push({
        ...candidate,
        detection: {
          ...candidate.detection,
          sources: [candidate.detection.source],
        },
      });
      continue;
    }

    const mergedConfidence = Math.min(0.99, Math.max(duplicate.detection.confidence, candidate.detection.confidence) + 0.05);
    duplicate.detection.confidence = mergedConfidence;
    duplicate.detection.sources = Array.from(new Set([
      ...(duplicate.detection.sources || [duplicate.detection.source]),
      candidate.detection.source,
    ]));
    duplicate.detection.reason = `${duplicate.detection.reason} + ${candidate.detection.reason}`;
    if (!duplicate.label && candidate.label) duplicate.label = candidate.label;
    if (!duplicate.semantic?.normalizedKey && candidate.semantic?.normalizedKey) duplicate.semantic = candidate.semantic;
  }

  return kept.map((candidate, index) => ({
    id: candidate.id || randomUUID(),
    documentId: candidate.documentId,
    pageIndex: candidate.pageIndex,
    pageNumber: candidate.pageNumber || candidate.pageIndex + 1,
    type: candidate.type || 'text',
    name: candidate.name || `greffio_${String(candidate.type || 'text')}_${index + 1}`,
    label: candidate.label || candidate.placeholder || `Champ ${index + 1}`,
    placeholder: candidate.placeholder || candidate.label || '',
    helpText: candidate.helpText,
    required: Boolean(candidate.required),
    readOnly: Boolean(candidate.readOnly),
    bbox: candidate.bbox,
    detection: {
      sources: candidate.detection.sources || [candidate.detection.source],
      confidence: candidate.detection.confidence,
      confidenceLabel: confidenceLabelFromScore(candidate.detection.confidence),
      reason: candidate.detection.reason,
      matchedText: candidate.detection.matchedText,
      nearbyLabel: candidate.detection.nearbyLabel,
      originalPdfFieldName: candidate.detection.originalPdfFieldName,
      needsHumanReview: candidate.detection.confidence < 0.68,
    },
    validation: candidate.validation,
    semantic: candidate.semantic,
    review: { status: 'auto_detected' },
    metadata: candidate.metadata,
  }));
};

export const buildAnalysisSummary = (fields = [], detectionMethodsUsed = []) => {
  const high = fields.filter((field) => field.detection.confidenceLabel === 'high').length;
  const medium = fields.filter((field) => field.detection.confidenceLabel === 'medium').length;
  const low = fields.filter((field) => field.detection.confidenceLabel === 'low').length;
  const needsReview = fields.filter((field) => field.detection.needsHumanReview).length;
  const globalConfidence = fields.length
    ? fields.reduce((sum, field) => sum + field.detection.confidence, 0) / fields.length
    : 0;
  return {
    totalFieldsDetected: fields.length,
    highConfidenceFields: high,
    mediumConfidenceFields: medium,
    lowConfidenceFields: low,
    fieldsNeedingReview: needsReview,
    detectionMethodsUsed: Array.from(new Set(detectionMethodsUsed)),
    globalConfidence: Number(globalConfidence.toFixed(3)),
  };
};
