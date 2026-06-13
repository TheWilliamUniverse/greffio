import { randomUUID } from 'node:crypto';
import { matchAdministrativeKeyword, normalizeFrenchLabel } from '../frenchAdministrativeKeywords.js';

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
    coordinateSystem: 'pdf_points',
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

export const detectUnderscoreFields = ({ pages = [] }) => {
  const candidates = [];
  for (const page of pages) {
    for (const block of page.blocks) {
      if (!UNDERSCORE_PATTERN.test(block.text)) continue;
      const labelBlock = page.blocks
        .filter((entry) => entry.x < block.x && Math.abs(entry.y - block.y) <= 10)
        .sort((a, b) => b.x - a.x)[0];
      const label = labelBlock?.text?.replace(/[:：]\s*$/, '').trim() || 'Champ à compléter';
      candidates.push(buildCandidate({
        page,
        label,
        type: 'text',
        bbox: {
          x: block.x,
          y: block.y,
          width: Math.max(block.width, 120),
          height: Math.max(block.height, 16),
        },
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
      const inlineUnderscore = text.match(/[:：]\s+(_{2,})/);
      const size = defaultFieldSize(admin?.type || 'text', page.width);
      const bbox = inlineUnderscore ? {
        x: block.x + block.width * 0.45,
        y: block.y,
        width: size.width,
        height: size.height,
      } : {
        x: block.x + block.width + 8,
        y: block.y,
        width: size.width,
        height: size.height,
      };
      candidates.push(buildCandidate({
        page,
        label,
        type: admin?.type || 'text',
        bbox,
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
      const target = rightBlocks[0];
      const size = defaultFieldSize(admin.type, page.width);
      const bbox = target ? {
        x: target.x,
        y: target.y,
        width: Math.max(target.width, size.width),
        height: Math.max(target.height, size.height),
      } : {
        x: block.x + block.width + 10,
        y: block.y,
        width: size.width,
        height: size.height,
      };
      candidates.push(buildCandidate({
        page,
        label: admin.matchedLabel,
        type: admin.type,
        bbox,
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
      candidates.push(buildCandidate({
        page,
        label: labelBlock?.text?.replace(/[:：].*$/, '').trim() || 'Date',
        type: 'date',
        bbox: {
          x: block.x,
          y: block.y,
          width: Math.max(block.width, 120),
          height: Math.max(block.height, 16),
        },
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
      candidates.push(buildCandidate({
        page,
        label,
        type: 'checkbox',
        bbox: {
          x: block.x,
          y: block.y,
          width: 16,
          height: 16,
        },
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
      candidates.push(buildCandidate({
        page,
        label: 'Signature',
        type: 'signature',
        bbox: {
          x: block.x + block.width + 8,
          y: block.y - 8,
          width: size.width,
          height: size.height,
        },
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
