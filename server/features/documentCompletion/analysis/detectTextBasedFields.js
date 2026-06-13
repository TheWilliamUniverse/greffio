import { randomUUID } from 'node:crypto';
import { matchAdministrativeKeyword, normalizeFrenchLabel } from '../frenchAdministrativeKeywords.js';
import { estimateTextRunBbox, normalizeFieldBbox } from './bboxHelpers.js';

const UNDERSCORE_PATTERN = /_{3,}/;
const DATE_PATTERN = /(\d{2}\s*[/.-]\s*\d{2}\s*[/.-]\s*\d{2,4}|_{2,}\s*[/.-]\s*_{2,}|jj\s*[/.-]\s*mm\s*[/.-]\s*aaaa)/i;
const CHECKBOX_PATTERN = /(\[\s*\]|□|☐|\(\s*\))/;

const defaultFieldSize = (type, pageWidth = 595) => {
  if (type === 'signature') return { width: Math.min(220, pageWidth * 0.35), height: 48 };
  if (type === 'checkbox') return { width: 16, height: 16 };
  if (type === 'date') return { width: 120, height: 18 };
  if (type === 'textarea') return { width: Math.min(320, pageWidth * 0.55), height: 54 };
  return { width: Math.min(260, pageWidth * 0.42), height: 18 };
};

const buildCandidate = ({
  page,
  label,
  type,
  bbox,
  source,
  confidence,
  reason,
  matchedText,
  nearbyLabel,
  semantic,
}) => ({
  id: randomUUID(),
  pageIndex: page.pageIndex,
  pageNumber: page.pageNumber,
  type,
  label,
  placeholder: label,
  bbox: {
    ...bbox,
    coordinateSystem: 'pdf_points_bottom_left',
  },
  detection: {
    source,
    confidence,
    reason,
    matchedText,
    nearbyLabel,
  },
  semantic: semantic || { category: 'unknown' },
});

const findBlocksOnSameLine = (blocks, targetBlock, tolerance = 8) => (
  blocks.filter((block) => Math.abs(block.y - targetBlock.y) <= tolerance)
);

const fieldBboxAfterLabel = (block, page, size) => {
  const text = String(block.text || '');
  const colonIdx = text.search(/[:：]/);
  const labelEndRatio = colonIdx >= 0 ? (colonIdx + 1) / Math.max(text.length, 1) : 0.55;
  const x = block.x + block.width * labelEndRatio + 8;
  const bbox = {
    x,
    y: block.y,
    width: size.width,
    height: size.height,
    coordinateSystem: 'pdf_points_bottom_left',
  };
  return normalizeFieldBbox(bbox, page.width, page.height) || bbox;
};

export const detectUnderscoreFields = ({ pages = [] }) => {
  const candidates = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      const match = block.text.match(UNDERSCORE_PATTERN);
      if (!match) continue;
      const labelBlock = page.blocks
        .filter((entry) => entry.x < block.x && Math.abs(entry.y - block.y) <= 10)
        .sort((a, b) => b.x - a.x)[0];
      const label = labelBlock?.text?.replace(/[:：]\s*$/, '').trim() || block.text.replace(UNDERSCORE_PATTERN, '').replace(/[:：]\s*$/, '').trim() || 'Champ à compléter';
      const bbox = estimateTextRunBbox(block, page.width, match.index || 0, match[0].length, 80);
      const normalized = normalizeFieldBbox(bbox, page.width, page.height);
      if (!normalized) continue;
      candidates.push(buildCandidate({
        page,
        label,
        type: 'text',
        bbox: normalized,
        source: 'text_underscore_line',
        confidence: 0.88,
        reason: 'Ligne de underscores détectée après un libellé',
        matchedText: block.text,
        nearbyLabel: labelBlock?.text,
      }));
    }
  }
  return candidates;
};

export const detectLabelColonFields = ({ pages = [] }) => {
  const candidates = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      const text = String(block.text || '').trim();
      if (!/[:：]\s*$/.test(text) && !/[:：]\s+_{2,}/.test(text)) continue;
      const admin = matchAdministrativeKeyword(text.replace(/[:：].*$/, ''));
      const label = admin?.matchedLabel || text.replace(/[:：].*$/, '').trim();
      const size = defaultFieldSize(admin?.type || 'text', page.width);
      const inlineUnderscore = text.match(/[:：]\s+(_{2,})/);
      let bbox;
      if (inlineUnderscore) {
        const idx = text.indexOf(inlineUnderscore[1]);
        bbox = estimateTextRunBbox(block, page.width, idx, inlineUnderscore[1].length, size.width);
      } else {
        bbox = fieldBboxAfterLabel(block, page, size);
      }
      const normalized = normalizeFieldBbox(bbox, page.width, page.height);
      if (!normalized) continue;
      candidates.push(buildCandidate({
        page,
        label,
        type: admin?.type || 'text',
        bbox: normalized,
        source: 'text_label_after_colon',
        confidence: 0.78 + (admin?.confidenceBoost || 0),
        reason: 'Libellé suivi de deux-points avec zone de saisie',
        matchedText: text,
        nearbyLabel: label,
        semantic: admin ? { category: admin.category, normalizedKey: admin.normalizedKey } : undefined,
      }));
    }
  }
  return candidates;
};

export const detectAdministrativeFields = ({ pages = [] }) => {
  const candidates = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      const admin = matchAdministrativeKeyword(block.text);
      if (!admin) continue;
      const lineBlocks = findBlocksOnSameLine(page.blocks, block);
      const rightBlocks = lineBlocks.filter((entry) => entry.x > block.x + block.width * 0.2);
      const target = rightBlocks.find((entry) => entry.x < page.width - 40);
      const size = defaultFieldSize(admin.type, page.width);
      const bbox = target ? {
        x: target.x,
        y: target.y,
        width: Math.min(Math.max(target.width, size.width), page.width - target.x - 8),
        height: Math.max(target.height, size.height),
      } : fieldBboxAfterLabel(block, page, size);
      const normalized = normalizeFieldBbox(bbox, page.width, page.height);
      if (!normalized) continue;
      candidates.push(buildCandidate({
        page,
        label: admin.matchedLabel,
        type: admin.type,
        bbox: normalized,
        source: 'text_keyword_near_empty_space',
        confidence: 0.72 + admin.confidenceBoost,
        reason: `Mot-clé administratif français : ${admin.matchedLabel}`,
        matchedText: block.text,
        nearbyLabel: admin.matchedLabel,
        semantic: { category: admin.category, normalizedKey: admin.normalizedKey },
      }));
    }
  }
  return candidates;
};

export const detectDateFields = ({ pages = [] }) => {
  const candidates = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      if (!DATE_PATTERN.test(block.text)) continue;
      const labelBlock = page.blocks.find((entry) => /date|le|né|née|fait/i.test(entry.text) && Math.abs(entry.y - block.y) <= 12);
      const match = block.text.match(DATE_PATTERN);
      const idx = match?.index ?? 0;
      const runLength = match?.[0]?.length || block.text.length;
      const bbox = estimateTextRunBbox(block, page.width, idx, runLength, 100);
      const normalized = normalizeFieldBbox(bbox, page.width, page.height);
      if (!normalized) continue;
      candidates.push(buildCandidate({
        page,
        label: labelBlock?.text?.replace(/[:：].*$/, '').trim() || 'Date',
        type: 'date',
        bbox: normalized,
        source: 'text_date_pattern',
        confidence: 0.84,
        reason: 'Motif de date ou placeholders JJ/MM/AAAA',
        matchedText: block.text,
        nearbyLabel: labelBlock?.text,
        semantic: { category: 'date', normalizedKey: 'date' },
      }));
    }
  }
  return candidates;
};

export const detectCheckboxFields = ({ pages = [] }) => {
  const candidates = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      if (!CHECKBOX_PATTERN.test(block.text)) continue;
      const label = block.text.replace(CHECKBOX_PATTERN, '').trim() || 'Case à cocher';
      const bbox = normalizeFieldBbox({
        x: block.x,
        y: block.y,
        width: 16,
        height: 16,
        coordinateSystem: 'pdf_points_bottom_left',
      }, page.width, page.height);
      if (!bbox) continue;
      candidates.push(buildCandidate({
        page,
        label,
        type: 'checkbox',
        bbox,
        source: 'text_checkbox_symbol',
        confidence: 0.8,
        reason: 'Symbole de case à cocher détecté',
        matchedText: block.text,
      }));
    }
  }
  return candidates;
};

export const detectSignatureFields = ({ pages = [] }) => {
  const candidates = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      const normalized = normalizeFrenchLabel(block.text);
      if (!normalized.includes('signature') && !normalized.includes('cachet')) continue;
      const size = defaultFieldSize('signature', page.width);
      const bbox = normalizeFieldBbox({
        x: block.x + Math.min(block.width * 0.45, page.width * 0.35) + 8,
        y: block.y - 4,
        width: size.width,
        height: size.height,
        coordinateSystem: 'pdf_points_bottom_left',
      }, page.width, page.height);
      if (!bbox) continue;
      candidates.push(buildCandidate({
        page,
        label: 'Signature',
        type: 'signature',
        bbox,
        source: 'text_signature_keyword',
        confidence: 0.9,
        reason: 'Zone de signature identifiée',
        matchedText: block.text,
        semantic: { category: 'signature', normalizedKey: 'signature' },
      }));
    }
  }
  return candidates;
};

export const detectTextBasedFields = (params) => [
  ...detectUnderscoreFields(params),
  ...detectLabelColonFields(params),
  ...detectAdministrativeFields(params),
  ...detectDateFields(params),
  ...detectCheckboxFields(params),
  ...detectSignatureFields(params),
];
